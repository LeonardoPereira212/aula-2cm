import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../app.js';
import { criarBancoFalso } from './bancoFalso.js';

let servidor;
let base;
let banco;
const H = { 'Content-Type': 'application/json', 'X-Requested-With': 'vitalmente' };

before(async () => {
  banco = criarBancoFalso();
  const app = criarApp(banco.pool);
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => {
  // Fecha conexões keep-alive do fetch para o processo conseguir encerrar.
  servidor.closeAllConnections?.();
  servidor.close();
});

async function chamar(metodo, caminho, corpo, cookie, extra = {}) {
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { ...H, ...(cookie ? { Cookie: cookie } : {}), ...extra },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, json, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
}

const ana = { nome: 'Ana Souza', username: 'ana_s', email: 'ana@email.com', senha: 'senha-forte-1' };
let cookieAna;

test('registro cria usuário, guarda hash (não a senha) e abre sessão', async () => {
  const r = await chamar('POST', '/api/auth/registro', ana);
  assert.equal(r.status, 201);
  assert.equal(r.json.usuario.username, 'ana_s');
  assert.match(r.cookie, /^vm_sessao=/);
  cookieAna = r.cookie;
  assert.ok(banco.tabelas.usuarios[0].senha_hash.startsWith('scrypt$'));
  assert.notEqual(banco.tabelas.usuarios[0].senha_hash, ana.senha);
  assert.equal(banco.tabelas.notificacoes.length, 1);
});

test('registro rejeita dados inválidos e duplicados', async () => {
  assert.equal((await chamar('POST', '/api/auth/registro', { ...ana, senha: '123' })).status, 400);
  assert.equal((await chamar('POST', '/api/auth/registro', { ...ana, email: 'x' })).status, 400);
  const dupEmail = await chamar('POST', '/api/auth/registro', { ...ana, username: 'outra' });
  assert.equal(dupEmail.status, 409);
  const dupUser = await chamar('POST', '/api/auth/registro', { ...ana, email: 'nova@email.com' });
  assert.equal(dupUser.status, 409);
});

test('login: sucesso por e-mail ou usuário; falha com mensagem genérica', async () => {
  const ok = await chamar('POST', '/api/auth/login', { identificador: 'ANA@email.com', senha: ana.senha });
  assert.equal(ok.status, 200);
  const ok2 = await chamar('POST', '/api/auth/login', { identificador: '@ana_s', senha: ana.senha });
  assert.equal(ok2.status, 200);
  const errada = await chamar('POST', '/api/auth/login', { identificador: 'ana_s', senha: 'errada123' });
  const inexistente = await chamar('POST', '/api/auth/login', { identificador: 'ninguem', senha: 'errada123' });
  assert.equal(errada.status, 401);
  assert.equal(inexistente.status, 401);
  assert.equal(errada.json.erro, inexistente.json.erro);
});

test('/me devolve o usuário com cookie e null sem cookie', async () => {
  assert.equal((await chamar('GET', '/api/auth/me', null, cookieAna)).json.usuario.email, 'ana@email.com');
  assert.equal((await chamar('GET', '/api/auth/me')).json.usuario, null);
  assert.equal((await chamar('GET', '/api/auth/me', null, 'vm_sessao=token-falso')).json.usuario, null);
});

test('CSRF: mutação sem cabeçalho ou de origem estranha é bloqueada', async () => {
  const semHeader = await fetch(base + '/api/publicacoes', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookieAna }, body: JSON.stringify({ texto: 'oi' }),
  });
  assert.equal(semHeader.status, 403);
  const origemRuim = await chamar('POST', '/api/publicacoes', { texto: 'oi' }, cookieAna, { Origin: 'https://site-malicioso.com' });
  assert.equal(origemRuim.status, 403);
});

test('publicar exige login, valida e persiste; reenvio idêntico não duplica', async () => {
  assert.equal((await chamar('POST', '/api/publicacoes', { texto: 'olá' })).status, 401);
  assert.equal((await chamar('POST', '/api/publicacoes', { texto: '   ' }, cookieAna)).status, 400);
  assert.equal((await chamar('POST', '/api/publicacoes', { texto: 'x'.repeat(281) }, cookieAna)).status, 400);
  assert.equal((await chamar('POST', '/api/publicacoes', { texto: 'ok', categoria: 'Inventada' }, cookieAna)).status, 400);
  const ok = await chamar('POST', '/api/publicacoes', { texto: 'Dormi bem hoje', sentimento: 'Bem', categoria: 'Sono' }, cookieAna);
  assert.equal(ok.status, 201);
  const dup = await chamar('POST', '/api/publicacoes', { texto: 'Dormi bem hoje' }, cookieAna);
  assert.equal(dup.status, 409);
  assert.equal(banco.tabelas.publicacoes.length, 1);
  const lista = await chamar('GET', '/api/publicacoes');
  assert.equal(lista.json.itens.length, 1);
  assert.equal(lista.json.itens[0].minha, false);
  assert.equal((await chamar('GET', '/api/publicacoes', null, cookieAna)).json.itens[0].minha, true);
});

test('excluir: só o dono consegue; outro usuário recebe 404 e o registro permanece', async () => {
  const bia = await chamar('POST', '/api/auth/registro', { nome: 'Bia Lima', username: 'bia', email: 'bia@email.com', senha: 'outra-senha-9' });
  const id = banco.tabelas.publicacoes[0].id;
  const negado = await chamar('DELETE', `/api/publicacoes/${id}`, null, bia.cookie);
  assert.equal(negado.status, 404);
  assert.equal(banco.tabelas.publicacoes.length, 1);
  assert.equal((await chamar('DELETE', `/api/publicacoes/${id}`)).status, 401);
  assert.equal((await chamar('DELETE', `/api/publicacoes/${id}`, null, cookieAna)).status, 200);
  assert.equal(banco.tabelas.publicacoes.length, 0);
});

test('rotas protegidas recusam visitantes (histórico, notificações, clientes, perfil)', async () => {
  for (const [m, c] of [['GET', '/api/historico'], ['GET', '/api/notificacoes'], ['GET', '/api/clientes'], ['PATCH', '/api/usuarios/me'], ['POST', '/api/assuntos/feedback']]) {
    assert.equal((await chamar(m, c, m === 'GET' ? null : {})).status, 401, `${m} ${c}`);
  }
});

test('alterar senha exige a atual, encerra outras sessões e permite novo login', async () => {
  const outra = await chamar('POST', '/api/auth/login', { identificador: 'ana_s', senha: ana.senha });
  assert.equal((await chamar('PUT', '/api/usuarios/me/senha', { senhaAtual: 'errada', novaSenha: 'nova-senha-123' }, cookieAna)).status, 400);
  assert.equal((await chamar('PUT', '/api/usuarios/me/senha', { senhaAtual: ana.senha, novaSenha: 'curta' }, cookieAna)).status, 400);
  assert.equal((await chamar('PUT', '/api/usuarios/me/senha', { senhaAtual: ana.senha, novaSenha: 'nova-senha-123' }, cookieAna)).status, 200);
  assert.equal((await chamar('GET', '/api/auth/me', null, cookieAna)).json.usuario.username, 'ana_s');
  assert.equal((await chamar('GET', '/api/auth/me', null, outra.cookie)).json.usuario, null);
  assert.equal((await chamar('POST', '/api/auth/login', { identificador: 'ana_s', senha: ana.senha })).status, 401);
  assert.equal((await chamar('POST', '/api/auth/login', { identificador: 'ana_s', senha: 'nova-senha-123' })).status, 200);
});

test('editar perfil valida e bloqueia e-mail de outra conta', async () => {
  assert.equal((await chamar('PATCH', '/api/usuarios/me', { nome: 'Ana S.', email: 'invalido', telefone: '' }, cookieAna)).status, 400);
  assert.equal((await chamar('PATCH', '/api/usuarios/me', { nome: 'Ana S.', email: 'bia@email.com', telefone: '' }, cookieAna)).status, 409);
  const ok = await chamar('PATCH', '/api/usuarios/me', { nome: 'Ana S.', email: 'ana2@email.com', telefone: '(11) 91234-5678' }, cookieAna);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.usuario.nome, 'Ana S.');
});

test('logout invalida a sessão no servidor', async () => {
  const l = await chamar('POST', '/api/auth/login', { identificador: 'ana_s', senha: 'nova-senha-123' });
  assert.equal((await chamar('POST', '/api/auth/logout', {}, l.cookie)).status, 200);
  assert.equal((await chamar('GET', '/api/auth/me', null, l.cookie)).json.usuario, null);
});

test('erro de banco não vaza detalhes; JSON inválido e rota inexistente são tratados', async () => {
  const antes = banco.pool.request;
  banco.pool.request = () => {
    throw Object.assign(new Error("connect ECONNREFUSED 10.0.0.5 senha=segredo"), { code: 'ECONNREFUSED' });
  };
  const r = await chamar('GET', '/api/auth/me', null, cookieAna);
  banco.pool.request = antes;
  assert.equal(r.status, 503);
  assert.ok(!JSON.stringify(r.json).includes('segredo') && !JSON.stringify(r.json).includes('10.0.0.5'));
  const ruim = await fetch(base + '/api/auth/login', { method: 'POST', headers: H, body: '{nao-json' });
  assert.equal(ruim.status, 400);
  assert.equal((await chamar('GET', '/api/nao-existe')).status, 404);
});
