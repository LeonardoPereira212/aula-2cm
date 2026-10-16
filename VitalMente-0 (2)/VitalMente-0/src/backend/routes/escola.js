// Rotas do módulo escolar: turmas, disciplinas, professores, alunos,
// matriculas, avaliacoes, frequencia, eventos_escolares
import { Router } from 'express';
import { ErroHttp, exigirLogin, exigirPapel, limitar } from '../middleware.js';
import { executar } from '../db.js';
import { validarPapel } from '../validacao.js';

export function rotasEscola(pool) {
  const r = Router();
  r.use(exigirLogin);

  const limite = limitar({ janelaMs: 60 * 1000, max: 60 });

  // Apenas admin e coordenador podem gerenciar dados cadastrais da escola
  const soGestao = exigirPapel(['admin', 'coordenador']);
  // Professores tambem podem gerenciar (criar/editar/excluir) recursos da escola
  const soGestaoOuProfessor = exigirPapel(['admin', 'coordenador', 'professor']);

  // ============================================================
  // TURMAS
  // ============================================================
  r.get('/turmas', async (req, res) => {
    const [itens] = await executar(pool, 'SELECT * FROM turmas ORDER BY ano DESC, semestre, nome');
    res.json({ itens });
  });

  r.post('/turmas', limite, soGestao, async (req, res) => {
    const { nome, ano, semestre, turno, sala } = req.body;
    if (!nome || !ano) throw new ErroHttp(400, 'Nome e ano sao obrigatorios.');
    const [ins] = await executar(pool,
      'INSERT INTO turmas (nome, ano, semestre, turno, sala) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2, @p3, @p4)',
      [nome, ano, semestre || 1, turno || 'Manha', sala || null]
    );
    res.status(201).json({ id: ins[0].id, nome, ano, semestre: semestre || 1, turno: turno || 'Manha', sala });
  });

  r.put('/turmas/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const { nome, ano, semestre, turno, sala } = req.body;
    const [, del] = await executar(pool,
      'UPDATE turmas SET nome=@p0, ano=@p1, semestre=@p2, turno=@p3, sala=@p4 WHERE id=@p5',
      [nome, ano, semestre || 1, turno || 'Manha', sala || null, id]
    );
    if (del === 0) throw new ErroHttp(404, 'Turma nao encontrada.');
    res.json({ id, nome, ano, semestre: semestre || 1, turno: turno || 'Manha', sala });
  });

  r.delete('/turmas/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const [, del] = await executar(pool, 'DELETE FROM turmas WHERE id=@p0', [id]);
    if (del === 0) throw new ErroHttp(404, 'Turma nao encontrada.');
    res.json({ ok: true });
  });

  // ============================================================
  // DISCIPLINAS
  // ============================================================
  r.get('/disciplinas', async (req, res) => {
    const [itens] = await executar(pool, 'SELECT * FROM disciplinas ORDER BY nome');
    res.json({ itens });
  });

  r.post('/disciplinas', limite, soGestao, async (req, res) => {
    const { nome, codigo, carga_horaria } = req.body;
    if (!nome || !codigo) throw new ErroHttp(400, 'Nome e codigo sao obrigatorios.');
    const [ins] = await executar(pool,
      'INSERT INTO disciplinas (nome, codigo, carga_horaria) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2)',
      [nome, codigo, carga_horaria || 40]
    );
    res.status(201).json({ id: ins[0].id, nome, codigo, carga_horaria: carga_horaria || 40 });
  });

  r.put('/disciplinas/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const { nome, codigo, carga_horaria } = req.body;
    const [, del] = await executar(pool,
      'UPDATE disciplinas SET nome=@p0, codigo=@p1, carga_horaria=@p2 WHERE id=@p3',
      [nome, codigo, carga_horaria || 40, id]
    );
    if (del === 0) throw new ErroHttp(404, 'Disciplina nao encontrada.');
    res.json({ id, nome, codigo, carga_horaria: carga_horaria || 40 });
  });

  r.delete('/disciplinas/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const [, del] = await executar(pool, 'DELETE FROM disciplinas WHERE id=@p0', [id]);
    if (del === 0) throw new ErroHttp(404, 'Disciplina nao encontrada.');
    res.json({ ok: true });
  });

  // ============================================================
  // PROFESSORES
  // ============================================================
  r.get('/professores', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT p.*, d.nome AS disciplina_nome
         FROM professores p LEFT JOIN disciplinas d ON d.id = p.disciplina_id
         ORDER BY p.nome`
    );
    res.json({ itens });
  });

  r.post('/professores', limite, soGestao, async (req, res) => {
    const { nome, email, matricula, telefone, disciplina_id, papel, status } = req.body;
    if (!nome || !email || !matricula) throw new ErroHttp(400, 'Nome, email e matricula sao obrigatorios.');
    validarPapel(papel || 'professor');
    const [ins] = await executar(pool,
      'INSERT INTO professores (nome, email, matricula, telefone, disciplina_id, status) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2, @p3, @p4, @p5)',
      [nome, email, matricula, telefone || null, disciplina_id || null, status || 'Ativo']
    );
    res.status(201).json({ id: ins[0].id, nome, email, matricula, telefone, disciplina_id, status: status || 'Ativo' });
  });

  r.put('/professores/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const { nome, email, matricula, telefone, disciplina_id, status } = req.body;
    const [, del] = await executar(pool,
      'UPDATE professores SET nome=@p0, email=@p1, matricula=@p2, telefone=@p3, disciplina_id=@p4, status=@p5 WHERE id=@p6',
      [nome, email, matricula, telefone || null, disciplina_id || null, status || 'Ativo', id]
    );
    if (del === 0) throw new ErroHttp(404, 'Professor nao encontrado.');
    res.json({ id, nome, email, matricula, telefone, disciplina_id, status });
  });

  r.delete('/professores/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const [, del] = await executar(pool, 'DELETE FROM professores WHERE id=@p0', [id]);
    if (del === 0) throw new ErroHttp(404, 'Professor nao encontrado.');
    res.json({ ok: true });
  });

  // ============================================================
  // ALUNOS
  // ============================================================
  r.get('/alunos', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT a.*, t.nome AS turma_nome
         FROM alunos a LEFT JOIN turmas t ON t.id = a.turma_id
         ORDER BY a.nome`
    );
    res.json({ itens });
  });

  r.post('/alunos', limite, soGestao, async (req, res) => {
    const { nome, email, matricula, data_nascimento, telefone, turma_id, responsavel_nome, responsavel_telefone, papel, status } = req.body;
    if (!nome || !matricula) throw new ErroHttp(400, 'Nome e matricula sao obrigatorios.');
    validarPapel(papel || 'aluno');
    const [ins] = await executar(pool,
      'INSERT INTO alunos (nome, email, matricula, data_nascimento, telefone, turma_id, responsavel_nome, responsavel_telefone, status) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)',
      [nome, email || null, matricula, data_nascimento || null, telefone || null, turma_id || null, responsavel_nome || null, responsavel_telefone || null, status || 'Ativo']
    );
    res.status(201).json({ id: ins[0].id, nome, email, matricula, data_nascimento, telefone, turma_id, responsavel_nome, responsavel_telefone, status: status || 'Ativo' });
  });

  r.put('/alunos/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const { nome, email, matricula, data_nascimento, telefone, turma_id, responsavel_nome, responsavel_telefone, status } = req.body;
    const [, del] = await executar(pool,
      'UPDATE alunos SET nome=@p0, email=@p1, matricula=@p2, data_nascimento=@p3, telefone=@p4, turma_id=@p5, responsavel_nome=@p6, responsavel_telefone=@p7, status=@p8 WHERE id=@p9',
      [nome, email || null, matricula, data_nascimento || null, telefone || null, turma_id || null, responsavel_nome || null, responsavel_telefone || null, status || 'Ativo', id]
    );
    if (del === 0) throw new ErroHttp(404, 'Aluno nao encontrado.');
    res.json({ id, nome, email, matricula, data_nascimento, telefone, turma_id, responsavel_nome, responsavel_telefone, status });
  });

  r.delete('/alunos/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const [, del] = await executar(pool, 'DELETE FROM alunos WHERE id=@p0', [id]);
    if (del === 0) throw new ErroHttp(404, 'Aluno nao encontrado.');
    res.json({ ok: true });
  });

  // ============================================================
  // MATRICULAS
  // ============================================================
  r.get('/matriculas', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT m.*, a.nome AS aluno_nome, t.nome AS turma_nome, d.nome AS disciplina_nome
         FROM matriculas m
         JOIN alunos a ON a.id = m.aluno_id
         JOIN turmas t ON t.id = m.turma_id
         JOIN disciplinas d ON d.id = m.disciplina_id
         ORDER BY m.ano DESC, m.semestre, a.nome`
    );
    res.json({ itens });
  });

  r.post('/matriculas', limite, soGestao, async (req, res) => {
    const { aluno_id, turma_id, disciplina_id, ano, semestre } = req.body;
    if (!aluno_id || !turma_id || !disciplina_id || !ano) throw new ErroHttp(400, 'Campos obrigatorios: aluno_id, turma_id, disciplina_id, ano.');
    const [ins] = await executar(pool,
      'INSERT INTO matriculas (aluno_id, turma_id, disciplina_id, ano, semestre) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2, @p3, @p4)',
      [aluno_id, turma_id, disciplina_id, ano, semestre || 1]
    );
    res.status(201).json({ id: ins[0].id, aluno_id, turma_id, disciplina_id, ano, semestre: semestre || 1 });
  });

  r.delete('/matriculas/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const [, del] = await executar(pool, 'DELETE FROM matriculas WHERE id=@p0', [id]);
    if (del === 0) throw new ErroHttp(404, 'Matricula nao encontrada.');
    res.json({ ok: true });
  });

  // ============================================================
  // AVALIACOES
  // ============================================================
  r.get('/avaliacoes', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT a.*, al.nome AS aluno_nome, d.nome AS disciplina_nome
         FROM avaliacoes a
         JOIN alunos al ON al.id = a.aluno_id
         JOIN disciplinas d ON d.id = a.disciplina_id
         ORDER BY a.data_avaliacao DESC`
    );
    res.json({ itens });
  });

  r.post('/avaliacoes', limite, soGestaoOuProfessor, async (req, res) => {
    const { aluno_id, disciplina_id, tipo, nota, nota_max, data_avaliacao, observacoes } = req.body;
    if (!aluno_id || !disciplina_id || !tipo || !nota || !data_avaliacao) throw new ErroHttp(400, 'Campos obrigatorios: aluno_id, disciplina_id, tipo, nota, data_avaliacao.');
    const [ins] = await executar(pool,
      'INSERT INTO avaliacoes (aluno_id, disciplina_id, tipo, nota, nota_max, data_avaliacao, observacoes) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6)',
      [aluno_id, disciplina_id, tipo, nota, nota_max || 10, data_avaliacao, observacoes || null]
    );
    res.status(201).json({ id: ins[0].id, aluno_id, disciplina_id, tipo, nota, nota_max: nota_max || 10, data_avaliacao, observacoes });
  });

  r.delete('/avaliacoes/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const [, del] = await executar(pool, 'DELETE FROM avaliacoes WHERE id=@p0', [id]);
    if (del === 0) throw new ErroHttp(404, 'Avaliacao nao encontrada.');
    res.json({ ok: true });
  });

  // ============================================================
  // FREQUENCIA
  // ============================================================
  r.get('/frequencia', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT f.*, a.nome AS aluno_nome, d.nome AS disciplina_nome
         FROM frequencia f
         JOIN alunos a ON a.id = f.aluno_id
         JOIN disciplinas d ON d.id = f.disciplina_id
         ORDER BY f.data_aula DESC`
    );
    res.json({ itens });
  });

  r.post('/frequencia', limite, soGestaoOuProfessor, async (req, res) => {
    const { aluno_id, disciplina_id, data_aula, presente, justificativa } = req.body;
    if (!aluno_id || !disciplina_id || !data_aula) throw new ErroHttp(400, 'Campos obrigatorios: aluno_id, disciplina_id, data_aula.');
    const [ins] = await executar(pool,
      'INSERT INTO frequencia (aluno_id, disciplina_id, data_aula, presente, justificativa) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2, @p3, @p4)',
      [aluno_id, disciplina_id, data_aula, presente !== undefined ? presente : 1, justificativa || null]
    );
    res.status(201).json({ id: ins[0].id, aluno_id, disciplina_id, data_aula, presente: presente !== undefined ? presente : 1, justificativa });
  });

  r.delete('/frequencia/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const [, del] = await executar(pool, 'DELETE FROM frequencia WHERE id=@p0', [id]);
    if (del === 0) throw new ErroHttp(404, 'Frequencia nao encontrada.');
    res.json({ ok: true });
  });

  // ============================================================
  // EVENTOS ESCOLARES
  // ============================================================
  r.get('/eventos', async (req, res) => {
    const [itens] = await executar(pool,
      `SELECT e.*, p.nome AS responsavel_nome
         FROM eventos_escolares e LEFT JOIN professores p ON p.id = e.responsavel_id
         ORDER BY e.data_evento`
    );
    res.json({ itens });
  });

  r.post('/eventos', limite, soGestaoOuProfessor, async (req, res) => {
    const { titulo, descricao, data_evento, local_evento, tipo, responsavel_id } = req.body;
    if (!titulo || !data_evento) throw new ErroHttp(400, 'Titulo e data do evento sao obrigatorios.');
    const [ins] = await executar(pool,
      'INSERT INTO eventos_escolares (titulo, descricao, data_evento, local_evento, tipo, responsavel_id) OUTPUT INSERTED.id AS id VALUES (@p0, @p1, @p2, @p3, @p4, @p5)',
      [titulo, descricao || null, data_evento, local_evento || null, tipo || 'Outro', responsavel_id || null]
    );
    res.status(201).json({ id: ins[0].id, titulo, descricao, data_evento, local_evento, tipo: tipo || 'Outro', responsavel_id });
  });

  r.delete('/eventos/:id', limite, soGestao, async (req, res) => {
    const id = Number(req.params.id);
    const [, del] = await executar(pool, 'DELETE FROM eventos_escolares WHERE id=@p0', [id]);
    if (del === 0) throw new ErroHttp(404, 'Evento nao encontrado.');
    res.json({ ok: true });
  });

  return r;
}
