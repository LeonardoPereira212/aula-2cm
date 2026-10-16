import { Router } from 'express';
import { transacao, executar } from '../db.js';
import { ErroHttp, exigirLogin, limitar } from '../middleware.js';
import { registrarHistorico } from '../servicos.js';
import { escaparLike, inteiroPositivo, validarPublicacao, CATEGORIAS } from '../validacao.js';

const formatar = (p, usuarioId) => ({
  id: p.id,
  texto: p.texto,
  sentimento: p.sentimento,
  categoria: p.categoria,
  criadoEm: p.criado_em,
  autor: { nome: p.autor_nome, username: p.autor_username },
  minha: usuarioId != null && p.usuario_id === usuarioId,
});

export function rotasPublicacoes(pool) {
  const r = Router();
  const limitePublicar = limitar({
    janelaMs: 10 * 60 * 1000,
    max: 20,
    chave: (req) => `pub|${req.usuario?.id ?? req.ip}`,
    mensagem: 'Você está publicando rápido demais. Aguarde um pouco.',
  });

  // Listagem pública (feed e Explorar). Paginação por cursor: ?antesDe=<id>
  r.get('/', async (req, res) => {
    const limite = inteiroPositivo(req.query.limite, 20, 50);
    const antesDe = inteiroPositivo(req.query.antesDe, null, Number.MAX_SAFE_INTEGER);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const categoria = typeof req.query.categoria === 'string' ? req.query.categoria : '';
    const filtros = [];
    const params = [];
    if (antesDe) { filtros.push('p.id < @p0'); params.push(antesDe); }
    if (q) {
      const idx = params.length;
      filtros.push(`(p.texto LIKE @p${idx} ESCAPE '\\\\' OR u.username LIKE @p${idx + 1} ESCAPE '\\\\' OR u.nome LIKE @p${idx + 2} ESCAPE '\\\\')`);
      const like = `%${escaparLike(q)}%`;
      params.push(like, like, like);
    }
    if (categoria) {
      if (!CATEGORIAS.includes(categoria)) throw new ErroHttp(400, 'Categoria inválida.');
      const idx = params.length;
      filtros.push(`p.categoria = @p${idx}`);
      params.push(categoria);
    }
    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    // TOP vai como número já validado (inteiro), nunca como texto do usuário.
    const [linhas] = await executar(pool,
      `SELECT TOP ${limite + 1} p.id, p.usuario_id, p.texto, p.sentimento, p.categoria, p.criado_em,
              u.nome AS autor_nome, u.username AS autor_username
         FROM publicacoes p JOIN usuarios u ON u.id = p.usuario_id
         ${where}
        ORDER BY p.id DESC`,
      params
    );
    const temMais = linhas.length > limite;
    const itens = linhas.slice(0, limite).map((p) => formatar(p, req.usuario?.id));
    res.json({ itens, proximo: temMais ? itens[itens.length - 1].id : null });
  });

  r.post('/', exigirLogin, limitePublicar, async (req, res) => {
    const dados = validarPublicacao(req.body);
    const id = await transacao(pool, async (conn) => {
      // Evita duplicar a mesma publicação em envios repetidos (duplo clique / reenvio).
      const [rep] = await executar(conn,
        'SELECT id FROM publicacoes WHERE usuario_id = @p0 AND texto = @p1 AND criado_em > DATEADD(SECOND, -60, GETUTCDATE()) ORDER BY id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY',
        [req.usuario.id, dados.texto]
      );
      if (rep[0]) throw new ErroHttp(409, 'Você acabou de publicar exatamente isso.');
      const [ins] = await executar(conn,
        'INSERT INTO publicacoes (usuario_id, texto, sentimento, categoria) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2, @p3)',
        [req.usuario.id, dados.texto, dados.sentimento, dados.categoria]
      );
      await registrarHistorico(conn, req.usuario.id, 'publicacao', 'Você fez uma publicação', ins[0].id);
      return ins[0].id;
    });
    res.status(201).json({
      publicacao: {
        id,
        texto: dados.texto,
        sentimento: dados.sentimento,
        categoria: dados.categoria,
        criadoEm: new Date().toISOString(),
        autor: { nome: req.usuario.nome, username: req.usuario.username },
        minha: true,
      },
    });
  });

  r.delete('/:id', exigirLogin, async (req, res) => {
    const id = inteiroPositivo(req.params.id, null, Number.MAX_SAFE_INTEGER);
    if (!id) throw new ErroHttp(404, 'Publicação não encontrada.');
    await transacao(pool, async (conn) => {
      // Só o dono consegue excluir; para os demais a resposta é a mesma de "não existe".
      const [, del] = await executar(conn, 'DELETE FROM publicacoes WHERE id = @p0 AND usuario_id = @p1', [id, req.usuario.id]);
      if (del === 0) throw new ErroHttp(404, 'Publicação não encontrada.');
      await registrarHistorico(conn, req.usuario.id, 'exclusao', 'Você excluiu uma publicação');
    });
    res.json({ ok: true });
  });

  return r;
}
