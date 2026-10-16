// Acesso aos dados reutilizado entre rotas.
import { novoToken, hashToken } from './seguranca.js';
import { config } from './config.js';
import { executar } from './db.js';

export const usuarioPublico = (u) => ({
  id: u.id,
  nome: u.nome,
  username: u.username,
  email: u.email,
  telefone: u.telefone ?? '',
  papel: u.papel ?? 'aluno',
  tipoAssinatura: u.tipo_assinatura,
});

export async function registrarHistorico(exec, usuarioId, tipo, descricao, referenciaId = null) {
  await executar(exec,
    'INSERT INTO historico (usuario_id, tipo, descricao, referencia_id) VALUES (@p0, @p1, @p2, @p3)',
    [usuarioId, tipo, descricao, referenciaId]
  );
}

export async function notificar(exec, usuarioId, tipo, titulo, mensagem) {
  await executar(exec,
    'INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem) VALUES (@p0, @p1, @p2, @p3)',
    [usuarioId, tipo, titulo, mensagem]
  );
}

export async function criarSessao(exec, usuarioId, userAgent) {
  const token = novoToken();
  const expira = new Date(Date.now() + config.sessao.duracaoDias * 86400000);
  await executar(exec,
    'INSERT INTO sessoes (usuario_id, token_hash, user_agent, expira_em) VALUES (@p0, @p1, @p2, @p3)',
    [usuarioId, hashToken(token), (userAgent || '').slice(0, 255) || null, expira]
  );
  return { token, expira };
}
