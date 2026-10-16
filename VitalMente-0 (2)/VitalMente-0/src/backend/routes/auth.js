import { Router } from 'express';
import { config } from '../config.js';
import { transacao, executar } from '../db.js';
import { ErroHttp, limitar, opcoesCookie } from '../middleware.js';
import { HASH_FALSO, hashSenha, hashToken, lerCookies, verificarSenha } from '../seguranca.js';
import { criarSessao, notificar, registrarHistorico, usuarioPublico } from '../servicos.js';
import { validarLogin, validarRegistro } from '../validacao.js';

export function rotasAuth(pool) {
  const r = Router();
  const limiteLogin = limitar({
    janelaMs: 15 * 60 * 1000,
    max: 10,
    chave: (req) => `${req.ip}|${String(req.body?.identificador || '').toLowerCase()}`,
    mensagem: 'Muitas tentativas de login. Aguarde alguns minutos.',
  });
  const limiteRegistro = limitar({ janelaMs: 60 * 60 * 1000, max: 10, mensagem: 'Muitos cadastros deste endereço. Tente mais tarde.' });

  function definirCookie(res, { token, expira }) {
    res.cookie(config.sessao.cookie, token, opcoesCookie({ expires: expira }));
  }

  r.get('/me', (req, res) => {
    res.json({ usuario: req.usuario ? usuarioPublico(req.usuario) : null });
  });

  r.post('/registro', limiteRegistro, async (req, res) => {
    const dados = validarRegistro(req.body);
    const senhaHash = await hashSenha(dados.senha);
    let usuario;
    let sessao;
    try {
      ({ usuario, sessao } = await transacao(pool, async (conn) => {
        const [res1] = await executar(conn,
          'INSERT INTO usuarios (nome, username, email, senha_hash) VALUES (@p0, @p1, @p2, @p3); SELECT SCOPE_IDENTITY() AS id',
          [dados.nome, dados.username, dados.email, senhaHash]
        );
        const id = res1[0].id;
        await notificar(conn, id, 'boas_vindas', 'Bem-vindo ao VitalMente', 'Sua conta foi criada. Compartilhe algo com a comunidade!');
        await registrarHistorico(conn, id, 'cadastro', 'Você criou sua conta no VitalMente');
        const s = await criarSessao(conn, id, req.get('user-agent'));
        return {
          usuario: { id, nome: dados.nome, username: dados.username, email: dados.email, telefone: null, tipo_assinatura: 'free' },
          sessao: s,
        };
      }));
    } catch (erro) {
      // mssql: erro de chave duplicada vem como number=2627 (code='EREQUEST').
      if (erro?.number === 2627 || erro?.code === 2627 || /violation of unique key|cannot insert duplicate/i.test(String(erro?.message || ''))) {
        const campo = String(erro.message).includes('username') ? 'username' : 'email';
        const msg = campo === 'username' ? 'Este nome de usuário já está em uso.' : 'Este e-mail já está cadastrado.';
        throw new ErroHttp(409, msg, { [campo]: msg });
      }
      throw erro;
    }
    definirCookie(res, sessao);
    res.status(201).json({ usuario: usuarioPublico(usuario) });
  });

  r.post('/login', limiteLogin, async (req, res) => {
    const { identificador, senha } = validarLogin(req.body);
    const [linhas] = await executar(pool,
      'SELECT id, nome, username, email, telefone, senha_hash, tipo_assinatura FROM usuarios WHERE email = @p0 OR username = @p1 ORDER BY id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY',
      [identificador, identificador]
    );
    const u = linhas[0];
    const ok = await verificarSenha(senha, u ? u.senha_hash : HASH_FALSO);
    if (!u || !ok) throw new ErroHttp(401, 'E-mail/usuário ou senha incorretos.');
    const sessao = await transacao(pool, async (conn) => {
      const s = await criarSessao(conn, u.id, req.get('user-agent'));
      await registrarHistorico(conn, u.id, 'login', 'Você entrou na sua conta');
      return s;
    });
    // Limpeza oportunista de sessões expiradas.
    executar(pool, 'DELETE FROM sessoes WHERE expira_em < GETUTCDATE()').catch(() => {});
    definirCookie(res, sessao);
    res.json({ usuario: usuarioPublico(u) });
  });

  r.post('/logout', async (req, res) => {
    const token = lerCookies(req.headers.cookie)[config.sessao.cookie];
    if (token) await executar(pool, 'DELETE FROM sessoes WHERE token_hash = @p0', [hashToken(token)]);
    res.clearCookie(config.sessao.cookie, opcoesCookie());
    res.json({ ok: true });
  });

  return r;
}
