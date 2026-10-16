import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSenha, verificarSenha, hashToken, lerCookies } from '../seguranca.js';
import { validarPublicacao, validarRegistro, escaparLike, ErroValidacao } from '../validacao.js';

test('hash de senha: salt aleatório, verificação correta e incorreta', async () => {
  const a = await hashSenha('minha-senha-1');
  const b = await hashSenha('minha-senha-1');
  assert.notEqual(a, b);
  assert.ok(await verificarSenha('minha-senha-1', a));
  assert.ok(!(await verificarSenha('outra', a)));
  assert.ok(!(await verificarSenha('x', 'lixo')));
});

test('token: hash determinístico de 64 hex; cookies malformados não quebram', () => {
  assert.match(hashToken('abc'), /^[0-9a-f]{64}$/);
  assert.deepEqual(lerCookies('a=1; b=%E0%A4%A; c=3'), { a: '1', c: '3' });
});

test('validação de publicação limita 280 caracteres (contando emoji como 1) e aceita acentos', () => {
  assert.equal(validarPublicacao({ texto: '😀'.repeat(280) }).texto.length > 0, true);
  assert.throws(() => validarPublicacao({ texto: '😀'.repeat(281) }), ErroValidacao);
  assert.equal(validarPublicacao({ texto: ' Ação é saúde ', categoria: 'Saúde mental' }).texto, 'Ação é saúde');
});

test('registro normaliza e-mail/usuário e rejeita usuário inválido', () => {
  const v = validarRegistro({ nome: ' Ana ', username: '@Ana_1', email: 'ANA@X.COM', senha: '12345678' });
  assert.deepEqual([v.nome, v.username, v.email], ['Ana', 'ana_1', 'ana@x.com']);
  assert.throws(() => validarRegistro({ nome: 'Ana', username: 'a b', email: 'a@x.com', senha: '12345678' }));
});

test('escaparLike neutraliza curingas', () => {
  assert.equal(escaparLike('50%_\\'), '50\\%\\_\\\\');
});
