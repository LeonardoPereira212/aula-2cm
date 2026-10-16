// Notificações, histórico, assuntos (trends) e clientes (demo).
import { Router } from 'express';
import { ErroHttp, exigirLogin } from '../middleware.js';
import { executar } from '../db.js';
import { validarCliente, validarFeedbackAssunto } from '../validacao.js';

export function rotasNotificacoes(pool) {
  const r = Router();
  r.use(exigirLogin);

  r.get('/', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT id, tipo, titulo, mensagem, lida, criado_em AS criadoEm
         FROM notificacoes WHERE usuario_id = @p0 ORDER BY id DESC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`,
      [req.usuario.id]
    );
    res.json({ itens: itens.map((n) => ({ ...n, lida: !!n.lida })) });
  });

  r.get('/nao-lidas', async (req, res) => {
    const [[linha]] = await executar(pool,
      'SELECT COUNT(*) AS total FROM notificacoes WHERE usuario_id = @p0 AND lida = 0',
      [req.usuario.id]
    );
    res.json({ total: Number(linha.total) });
  });

  r.post('/marcar-lidas', async (req, res) => {
    await executar(pool, 'UPDATE notificacoes SET lida = 1 WHERE usuario_id = @p0 AND lida = 0', [req.usuario.id]);
    res.json({ ok: true });
  });
  return r;
}

export function rotasHistorico(pool) {
  const r = Router();
  r.use(exigirLogin);
  r.get('/', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT id, tipo, descricao, criado_em AS criadoEm
         FROM historico WHERE usuario_id = @p0 ORDER BY id DESC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`,
      [req.usuario.id]
    );
    res.json({ itens });
  });
  return r;
}

export function rotasAssuntos(pool) {
  const r = Router();

  // Público: contagem real de publicações que mencionam cada assunto.
  r.get('/', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT a.titulo, a.categoria,
               (SELECT COUNT(*) FROM publicacoes p WHERE CHARINDEX(a.titulo, p.texto) > 0) AS publicacoes
          FROM assuntos a ORDER BY a.id`
    );
    res.json({ itens: itens.map((a) => ({ ...a, publicacoes: Number(a.publicacoes) })) });
  });

  r.post('/feedback', exigirLogin, async (req, res) => {
    const { assunto, opcao } = validarFeedbackAssunto(req.body);
    const [[existe]] = await executar(pool, 'SELECT COUNT(*) AS n FROM assuntos WHERE titulo = @p0', [assunto]);
    if (!Number(existe.n)) throw new ErroHttp(404, 'Assunto não encontrado.');
    await executar(pool, 'INSERT INTO assuntos_feedback (usuario_id, assunto, opcao) VALUES (@p0, @p1, @p2)', [
      req.usuario.id,
      assunto,
      opcao,
    ]);
    res.status(201).json({ ok: true });
  });
  return r;
}

// Página "Clientes" (demonstração já existente). Agora exige login.
export function rotasClientes(pool) {
  const r = Router();
  r.use(exigirLogin);

  r.get('/', async (req, res) => {
    const [clientes] = await executar(pool, 'SELECT id, nome, email FROM clientes ORDER BY id DESC OFFSET 0 ROWS FETCH NEXT 500 ROWS ONLY');
    res.json(clientes);
  });

  r.post('/', async (req, res) => {
    const { nome, email } = validarCliente(req.body);
    const [dup] = await executar(pool, 'SELECT id FROM clientes WHERE email = @p0 ORDER BY id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY', [email]);
    if (dup[0]) throw new ErroHttp(409, 'Já existe um cliente com este e-mail.');
    const [ins] = await executar(pool, 'INSERT INTO clientes (nome, email) OUTPUT INSERTED.id AS id VALUES (@p0, @p1)', [nome, email]);
    res.status(201).json({ id: ins[0].id, nome, email });
  });
  return r;
}
