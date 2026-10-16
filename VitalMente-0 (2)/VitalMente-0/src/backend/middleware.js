import { config } from './config.js';
import { hashToken, lerCookies } from './seguranca.js';
import { ErroValidacao } from './validacao.js';
import { executar } from './db.js';

export class ErroHttp extends Error {
  constructor(status, mensagem, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

export function cabecalhosSeguros(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  next();
}

// Proteção CSRF para métodos que alteram dados:
//  1) cabeçalho customizado obrigatório (um site de terceiros não consegue enviá-lo sem passar pelo CORS);
//  2) se o navegador enviar Origin, ele precisa ser de uma origem autorizada ou o próprio site.
export function protecaoCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'vitalmente')
    return next(new ErroHttp(403, 'Requisição não autorizada.'));
  const origem = req.get('Origin');
  if (origem) {
    const proprio = `${req.protocol}://${req.get('host')}`;
    if (origem !== proprio && !config.origensPermitidas.includes(origem))
      return next(new ErroHttp(403, 'Origem não autorizada.'));
  }
  next();
}

// Limitador simples em memória (por processo). Em vários servidores use um limitador compartilhado.
export function limitar({ janelaMs, max, chave = (req) => req.ip, mensagem }) {
  const acessos = new Map();
  return (req, res, next) => {
    const agora = Date.now();
    const k = chave(req);
    const atual = (acessos.get(k) || []).filter((t) => agora - t < janelaMs);
    if (atual.length >= max) {
      res.setHeader('Retry-After', Math.ceil(janelaMs / 1000));
      return next(new ErroHttp(429, mensagem || 'Muitas tentativas. Tente novamente em instantes.'));
    }
    atual.push(agora);
    acessos.set(k, atual);
    if (acessos.size > 5000) {
      for (const [chaveAntiga, ts] of acessos)
        if (!ts.some((t) => agora - t < janelaMs)) acessos.delete(chaveAntiga);
    }
    next();
  };
}

export function opcoesCookie(extra = {}) {
  return {
    httpOnly: true,
    sameSite: config.sessao.sameSite,
    secure: config.sessao.secure,
    path: '/',
    ...extra,
  };
}

// Carrega o usuário da sessão (se houver) em req.usuario; visitante => null.
// Inclui o papel (admin, coordenador, professor, aluno, responsavel).
export function carregarSessao(pool) {
  return async (req, res, next) => {
    req.usuario = null;
    const token = lerCookies(req.headers.cookie)[config.sessao.cookie];
    if (!token) return next();
    const [linhas] = await executar(pool, `
      SELECT u.id, u.nome, u.username, u.email, u.telefone, u.tipo_assinatura, u.papel, s.id AS sessao_id
         FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = @p0 AND s.expira_em > GETUTCDATE()`,
      [hashToken(token)]
    );
    if (linhas[0]) req.usuario = linhas[0];
    next();
  };
}

// Middleware: exige que o usuário logado tenha um dos papéis permitidos.
// papéis: array de strings, ex: ['admin', 'coordenador', 'professor']
export function exigirPapel(papeis) {
  return (req, res, next) => {
    if (!req.usuario) return next(new ErroHttp(401, 'Faça login para continuar.'));
    if (!Array.isArray(papeis) || papeis.length === 0)
      return next(new ErroHttp(500, 'Papeis nao configurados.'));
    if (!papeis.includes(req.usuario.papel))
      return next(new ErroHttp(403, 'Acesso nao autorizado para este papel.'));
    next();
  };
}

export function exigirLogin(req, res, next) {
  if (!req.usuario) return next(new ErroHttp(401, 'Faça login para continuar.'));
  next();
}

const CODIGOS_BANCO_INDISPONIVEL = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_CON_COUNT_ERROR',
  'ER_NO_SUCH_TABLE',
]);

// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, req, res, next) {
  if (erro?.type === 'entity.parse.failed' || erro?.type === 'entity.too.large')
    return res.status(400).json({ erro: 'Corpo da requisição inválido.' });
  if (erro instanceof ErroHttp || erro instanceof ErroValidacao)
    return res.status(erro.status).json({ erro: erro.message, campos: erro.campos });
  if (erro?.code === 'ER_DUP_ENTRY' || erro?.number === 2627 || erro?.code === 2627)
    return res.status(409).json({ erro: 'Registro duplicado.' });
  if (CODIGOS_BANCO_INDISPONIVEL.has(erro?.code)) {
    console.error('[banco indisponível]', erro.code);
    return res.status(503).json({ erro: 'Serviço temporariamente indisponível. Tente novamente em instantes.' });
  }
  // Detalhes ficam só no log do servidor, nunca na resposta.
  console.error('[erro]', erro?.code || '', erro?.message);
  res.status(500).json({ erro: 'Ocorreu um erro inesperado. Tente novamente.' });
}
