================================================================================================
 VITALMENTE - Migracao inicial (SQL Server): estrutura completa
================================================================================================
Aplicada automaticamente por: npm run db:migrate (cria o banco se nao existir; nunca apaga nada)
Espelha as secoes 0 a 3 do src/backend/schema.sql. Seed de exemplos: npm run db:seed
================================================================================================

-- ----------------------------------------------------------------------------
-- 0. CRIA��O E SELE��O DO BANCO
-- ----------------------------------------------------------------------------

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'vitalmente')
BEGIN
    CREATE DATABASE vitalmente
        COLLATE Latin1_General_100_CI_AS_KS_WS_SC_UTF8;
END;

GO

USE vitalmente;

GO

-- ----------------------------------------------------------------------------
-- 1. TABELA DE CONTROLE DE MIGRA��ES
--     Usada pelo script src/backend/migrar.js (npm run db:migrate)
-- ----------------------------------------------------------------------------

IF OBJECT_ID('schema_migrations', 'U') IS NULL
BEGIN
    CREATE TABLE schema_migrations (
        nome NVARCHAR(190) NOT NULL PRIMARY KEY,
        aplicada_em DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END;

GO

-- ----------------------------------------------------------------------------
-- 2. CORE � AUTENTICA��O E REDE SOCIAL DE BEM-ESTAR
-- ----------------------------------------------------------------------------

-- Usu�rios do sistema (alunos, professores, coordenadores, respons�veis, admin)
IF OBJECT_ID('usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE usuarios (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL,
        username NVARCHAR(30) NOT NULL UNIQUE,
        email NVARCHAR(160) NOT NULL UNIQUE,
        senha_hash NVARCHAR(255) NOT NULL,
        telefone NVARCHAR(20) NULL,
        papel NVARCHAR(20) NOT NULL DEFAULT 'aluno'
            CHECK (papel IN ('admin', 'coordenador', 'professor', 'aluno', 'responsavel')),
        tipo_assinatura NVARCHAR(20) NOT NULL DEFAULT 'free',
        criado_em DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        atualizado_em DATETIME2 NULL
    );
END;

GO

-- Sess�es de login (token hash + expira��o)
IF OBJECT_ID('sessoes', 'U') IS NULL
BEGIN
    CREATE TABLE sessoes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        token_hash CHAR(64) NOT NULL,
        user_agent NVARCHAR(255) NULL,
        expira_em DATETIME2 NOT NULL,
        criado_em DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);
    CREATE INDEX idx_sessoes_expira ON sessoes(expira_em);
END;

GO

-- Publica��es do feed (rede social de bem-estar)
IF OBJECT_ID('publicacoes', 'U') IS NULL
BEGIN
    CREATE TABLE publicacoes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        texto NVARCHAR(280) NOT NULL,
        sentimento NVARCHAR(30) NULL,
        categoria NVARCHAR(50) NULL,
        criado_em DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_publicacoes_usuario ON publicacoes(usuario_id);
    CREATE INDEX idx_publicacoes_criado ON publicacoes(criado_em DESC);
END;

GO

-- Notifica��es por usu�rio
IF OBJECT_ID('notificacoes', 'U') IS NULL
BEGIN
    CREATE TABLE notificacoes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo NVARCHAR(30) NOT NULL,
        titulo NVARCHAR(120) NOT NULL,
        mensagem NVARCHAR(500) NOT NULL,
        lida BIT NOT NULL DEFAULT 0,
        criado_em DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id, lida);
END;

GO

-- Hist�rico de a��es do usu�rio
IF OBJECT_ID('historico', 'U') IS NULL
BEGIN
    CREATE TABLE historico (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo NVARCHAR(30) NOT NULL,
        descricao NVARCHAR(255) NOT NULL,
        referencia_id INT NULL,
        criado_em DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_historico_usuario ON historico(usuario_id, criado_em DESC);
END;

GO

-- Assuntos/temas do feed
IF OBJECT_ID('assuntos', 'U') IS NULL
BEGIN
    CREATE TABLE assuntos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        titulo NVARCHAR(120) NOT NULL UNIQUE,
        categoria NVARCHAR(50) NOT NULL,
        criado_em DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END;

GO

-- Feedback dos usu�rios sobre assuntos
IF OBJECT_ID('assuntos_feedback', 'U') IS NULL
BEGIN
    CREATE TABLE assuntos_feedback (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        assunto NVARCHAR(120) NOT NULL,
        opcao NVARCHAR(120) NOT NULL,
        criado_em DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE (usuario_id, assunto)
    );
    CREATE INDEX idx_feedback_assunto ON assuntos_feedback(assunto);
END;

GO

-- Clientes (tabela de demonstra��o j� existente)
IF OBJECT_ID('clientes', 'U') IS NULL
BEGIN
    CREATE TABLE clientes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(120) NOT NULL,
        email NVARCHAR(160) NOT NULL UNIQUE,
        criado_em DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END;

GO

-- ----------------------------------------------------------------------------
-- 3. M�DULO ESCOLAR � GEST�O ACAD�MICA
-- ----------------------------------------------------------------------------

-- Turmas (s�ries/anos)
IF OBJECT_ID('turmas', 'U') IS NULL
BEGIN
    CREATE TABLE turmas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(60) NOT NULL,
        ano INT NOT NULL,
        semestre TINYINT NOT NULL DEFAULT 1,
        turno NVARCHAR(20) NOT NULL DEFAULT 'Manha',
        sala NVARCHAR(20) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NULL
    );
    CREATE INDEX idx_turmas_ano ON turmas(ano, semestre);
END;

GO

-- Disciplinas (mat�rias)
IF OBJECT_ID('disciplinas', 'U') IS NULL
BEGIN
    CREATE TABLE disciplinas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL,
        codigo NVARCHAR(20) NOT NULL UNIQUE,
        carga_horaria INT NOT NULL DEFAULT 40,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NULL
    );
END;

GO

-- Professores (vinculados a um usu�rio para login e a uma disciplina)
IF OBJECT_ID('professores', 'U') IS NULL
BEGIN
    CREATE TABLE professores (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NULL UNIQUE,
        nome NVARCHAR(100) NOT NULL,
        email NVARCHAR(160) NOT NULL UNIQUE,
        matricula NVARCHAR(20) NOT NULL UNIQUE,
        telefone NVARCHAR(20) NULL,
        disciplina_id INT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'Ativo'
            CHECK (status IN ('Ativo', 'Afastado', 'Demitido')),
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL
    );
    CREATE INDEX idx_professores_disciplina ON professores(disciplina_id);
    CREATE INDEX idx_professores_matricula ON professores(matricula);
END;

GO

-- Alunos (vinculados a uma turma e opcionalmente a um usu�rio para login)
IF OBJECT_ID('alunos', 'U') IS NULL
BEGIN
    CREATE TABLE alunos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NULL UNIQUE,
        nome NVARCHAR(100) NOT NULL,
        email NVARCHAR(160) NULL UNIQUE,
        matricula NVARCHAR(20) NOT NULL UNIQUE,
        data_nascimento DATE NULL,
        telefone NVARCHAR(20) NULL,
        turma_id INT NULL,
        responsavel_nome NVARCHAR(100) NULL,
        responsavel_telefone NVARCHAR(20) NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'Ativo'
            CHECK (status IN ('Ativo', 'Trancado', 'Transferido', 'Concluido')),
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE SET NULL
    );
    CREATE INDEX idx_alunos_turma ON alunos(turma_id);
    CREATE INDEX idx_alunos_matricula ON alunos(matricula);
END;

GO

-- Matr�culas (aluno � turma � disciplina � ano � semestre)
IF OBJECT_ID('matriculas', 'U') IS NULL
BEGIN
    CREATE TABLE matriculas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        aluno_id INT NOT NULL,
        turma_id INT NOT NULL,
        disciplina_id INT NOT NULL,
        ano INT NOT NULL,
        semestre TINYINT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
        FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
        UNIQUE (aluno_id, disciplina_id, ano, semestre)
    );
    CREATE INDEX idx_matriculas_aluno ON matriculas(aluno_id);
    CREATE INDEX idx_matriculas_turma ON matriculas(turma_id);
END;

GO

-- Avalia��es (notas dos alunos)
IF OBJECT_ID('avaliacoes', 'U') IS NULL
BEGIN
    CREATE TABLE avaliacoes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        aluno_id INT NOT NULL,
        disciplina_id INT NOT NULL,
        tipo NVARCHAR(30) NOT NULL
            CHECK (tipo IN ('Prova', 'Trabalho', 'Seminario', 'Lista', 'Participacao', 'Recuperacao')),
        nota DECIMAL(4,2) NOT NULL,
        nota_max DECIMAL(4,2) NOT NULL DEFAULT 10.00,
        data_avaliacao DATE NOT NULL,
        observacoes NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_avaliacoes_aluno ON avaliacoes(aluno_id);
    CREATE INDEX idx_avaliacoes_disciplina ON avaliacoes(disciplina_id);
    CREATE INDEX idx_avaliacoes_data ON avaliacoes(data_avaliacao);
END;

GO

-- Frequ�ncia (presen�a por aula)
IF OBJECT_ID('frequencia', 'U') IS NULL
BEGIN
    CREATE TABLE frequencia (
        id INT IDENTITY(1,1) PRIMARY KEY,
        aluno_id INT NOT NULL,
        disciplina_id INT NOT NULL,
        data_aula DATE NOT NULL,
        presente BIT NOT NULL DEFAULT 1,
        justificativa NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
        UNIQUE (aluno_id, disciplina_id, data_aula)
    );
    CREATE INDEX idx_frequencia_aluno ON frequencia(aluno_id);
    CREATE INDEX idx_frequencia_data ON frequencia(data_aula);
END;

GO

-- Eventos escolares (provas, reuni�es, feriados, festas)
IF OBJECT_ID('eventos_escolares', 'U') IS NULL
BEGIN
    CREATE TABLE eventos_escolares (
        id INT IDENTITY(1,1) PRIMARY KEY,
        titulo NVARCHAR(120) NOT NULL,
        descricao NVARCHAR(500) NULL,
        data_evento DATETIME2 NOT NULL,
        local_evento NVARCHAR(120) NULL,
        tipo NVARCHAR(20) NOT NULL DEFAULT 'Outro'
            CHECK (tipo IN ('Aula', 'Prova', 'Reuniao', 'Evento', 'Feriado', 'Outro')),
        responsavel_id INT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FOREIGN KEY (responsavel_id) REFERENCES professores(id) ON DELETE SET NULL
    );
    CREATE INDEX idx_eventos_data ON eventos_escolares(data_evento);
END;

GO

