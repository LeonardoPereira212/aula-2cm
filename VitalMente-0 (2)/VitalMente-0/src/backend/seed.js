// Script de seed: popula o banco vitalmente com dados de exemplo da escola.
// Uso: npm run db:seed   (precisa do .env configurado e banco ja criado — npm run db:migrate)
import sql from 'mssql';
import { config } from './config.js';
import { hashSenha } from './seguranca.js';

const SENHA_PADRAO = '12345678';

async function main() {
  const senhaHash = await hashSenha(SENHA_PADRAO);
  const conn = await new sql.ConnectionPool({
    server: config.db.server,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    options: config.db.options,
    pool: config.db.pool,
  }).connect();

  const exec = (sqlTexto) => conn.request().input('hash', sql.NVarChar(255), senhaHash).query(sqlTexto);

  try {
    // Usuarios (IF NOT EXISTS deixa o seed idempotente, como o INSERT IGNORE do MySQL)
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM usuarios)
      INSERT INTO usuarios (nome, username, email, senha_hash, telefone, papel, tipo_assinatura) VALUES
        (N'Administrador Sistema', N'admin', N'admin@escola.edu.br', @hash, NULL, N'admin', N'free'),
        (N'Coordenadora Escola', N'coord_escola', N'coord@escola.edu.br', @hash, NULL, N'coordenador', N'free'),
        (N'Carlos Almeida', N'carlos_prof', N'carlos.almeida@escola.edu.br', @hash, N'(11) 90000-0001', N'professor', N'free'),
        (N'Mariana Costa', N'mariana_prof', N'mariana.costa@escola.edu.br', @hash, N'(11) 90000-0002', N'professor', N'free'),
        (N'Ana Souza', N'ana_aluno', N'ana.souza@email.com', @hash, N'(11) 91111-1111', N'aluno', N'free'),
        (N'Bruno Lima', N'bruno_aluno', N'bruno.lima@email.com', @hash, N'(11) 93333-3333', N'aluno', N'free')`);

    // Turmas
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM turmas)
      INSERT INTO turmas (nome, ano, semestre, turno, sala) VALUES
        (N'3º A', 2026, 1, N'Manha', N'101'),
        (N'3º B', 2026, 1, N'Tarde', N'102'),
        (N'2º A', 2026, 1, N'Manha', N'201')`);

    // Disciplinas
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM disciplinas)
      INSERT INTO disciplinas (nome, codigo, carga_horaria) VALUES
        (N'Matematica', N'MAT101', 40),
        (N'Portugues', N'POR102', 40),
        (N'Historia', N'HIS103', 40),
        (N'Geografia', N'GEO104', 40),
        (N'Ciencias', N'CIE105', 40),
        (N'Ingles', N'ING106', 40),
        (N'Educacao Fisica', N'EDF107', 40),
        (N'Arte', N'ART108', 40)`);

    // Professores (vinculados aos usuarios 3 e 4)
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM professores)
      INSERT INTO professores (usuario_id, nome, email, matricula, telefone, disciplina_id, status) VALUES
        (3, N'Carlos Almeida', N'carlos.almeida@escola.edu.br', N'PROF001', N'(11) 90000-0001', 1, N'Ativo'),
        (4, N'Mariana Costa', N'mariana.costa@escola.edu.br', N'PROF002', N'(11) 90000-0002', 2, N'Ativo')`);

    // Alunos (vinculados aos usuarios 5 e 6, turma 1)
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM alunos)
      INSERT INTO alunos (usuario_id, nome, email, matricula, data_nascimento, telefone, turma_id, responsavel_nome, responsavel_telefone, status) VALUES
        (5, N'Ana Souza', N'ana.souza@email.com', N'ALU001', '2008-03-15', N'(11) 91111-1111', 1, N'Paulo Souza', N'(11) 92222-2222', N'Ativo'),
        (6, N'Bruno Lima', N'bruno.lima@email.com', N'ALU002', '2008-07-20', N'(11) 93333-3333', 1, N'Fernanda Lima', N'(11) 94444-4444', N'Ativo')`);

    // Matriculas
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM matriculas)
      INSERT INTO matriculas (aluno_id, turma_id, disciplina_id, ano, semestre) VALUES
        (1, 1, 1, 2026, 1), (1, 1, 2, 2026, 1), (1, 1, 3, 2026, 1),
        (2, 1, 1, 2026, 1), (2, 1, 2, 2026, 1), (2, 1, 4, 2026, 1)`);

    // Avaliacoes
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM avaliacoes)
      INSERT INTO avaliacoes (aluno_id, disciplina_id, tipo, nota, nota_max, data_avaliacao, observacoes) VALUES
        (1, 1, N'Prova', 8.50, 10.00, '2026-03-20', N'Bom raciocinio logico.'),
        (1, 2, N'Trabalho', 9.00, 10.00, '2026-03-25', N'Texto bem estruturado.'),
        (2, 1, N'Prova', 6.50, 10.00, '2026-03-20', N'Precisa revisar fracoes.')`);

    // Frequencia
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM frequencia)
      INSERT INTO frequencia (aluno_id, disciplina_id, data_aula, presente, justificativa) VALUES
        (1, 1, '2026-03-10', 1, NULL),
        (1, 1, '2026-03-17', 0, N'Consulta medica'),
        (2, 1, '2026-03-10', 1, NULL),
        (2, 1, '2026-03-17', 1, NULL)`);

    // Eventos escolares
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM eventos_escolares)
      INSERT INTO eventos_escolares (titulo, descricao, data_evento, local_evento, tipo, responsavel_id) VALUES
        (N'Reuniao de Pais e Mestres', N'Apresentacao do plano de ensino do 1o semestre.', '2026-04-15 19:00:00', N'Auditorio Central', N'Reuniao', 1),
        (N'Prova de Matematica', N'Avaliacao bimestral de Matematica.', '2026-04-22 08:00:00', N'Sala 101', N'Prova', 1),
        (N'Festa Junina', N'Festa escolar com apresentacoes dos alunos.', '2026-06-20 14:00:00', N'Patio da Escola', N'Evento', 2)`);

    // Assuntos do bem-estar
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM assuntos)
      INSERT INTO assuntos (titulo, categoria) VALUES
        (N'Organizacao de estudos', N'Saude mental'),
        (N'Gerenciamento de ansiedade antes de provas', N'Saude mental'),
        (N'Habitos de sono', N'Sono'),
        (N'Alimentacao saudavel na escola', N'Nutricao'),
        (N'Exercicios fisicos na rotina escolar', N'Exercicios')`);

    // Clientes de demonstracao
    await exec(`
      IF NOT EXISTS (SELECT 1 FROM clientes)
      INSERT INTO clientes (nome, email) VALUES
        (N'Escola Estadual VitalMente', N'contato@vitalmente.edu.br'),
        (N'Escola Municipal Sao Paulo', N'sao.paulo@edu.br')`);

    console.log('Seed concluido com sucesso.');
    console.log('Senha padrao para todos os usuarios:', SENHA_PADRAO);
  } catch (erro) {
    console.error('Falha no seed:', erro.code ? `${erro.code}: ${erro.message}` : erro.message);
    process.exitCode = 1;
  } finally {
    await conn.close();
  }
}

main();
