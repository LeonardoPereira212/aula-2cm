// Aplica os arquivos de migrations/ em ordem, uma única vez cada (tabela schema_migrations).
// Uso: npm run db:migrate   (cria o banco se ele não existir; nunca apaga nada)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';
import { config } from './config.js';

const pasta = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const { server, port, database, user, password, options, pool } = config.db;

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  console.error('DB_NAME inválido (use apenas letras, números e _).');
  process.exit(1);
}

const opcoes = { server, port, database, user, password, options, pool };

try {
  // 1) Conecta no master e cria o banco caso ainda não exista.
  const master = await new sql.ConnectionPool({ ...opcoes, database: 'master' }).connect();
  try {
    await master.request().query(`IF DB_ID(N'${database}') IS NULL CREATE DATABASE [${database}]`);
  } finally {
    await master.close();
  }

  // 2) Conecta no banco da aplicação e aplica as migrations pendentes.
  const conn = await new sql.ConnectionPool(opcoes).connect();
  try {
    await conn.request().query(`IF OBJECT_ID('schema_migrations', 'U') IS NULL
      CREATE TABLE schema_migrations (
        nome NVARCHAR(190) NOT NULL PRIMARY KEY,
        aplicada_em DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      )`);
    const { recordset: feitas } = await conn.request().query('SELECT nome FROM schema_migrations');
    const jaAplicadas = new Set(feitas.map((r) => r.nome));
    const arquivos = (await fs.readdir(pasta)).filter((f) => f.endsWith('.sql')).sort();

    for (const arquivo of arquivos) {
      if (jaAplicadas.has(arquivo)) {
        console.log(`= ${arquivo} (já aplicada)`);
        continue;
      }
      const conteudo = await fs.readFile(path.join(pasta, arquivo), 'utf8');
      // "GO" é separador de batch do SSMS/sqlcmd e não é aceito pelo driver;
      // executamos cada batch separadamente.
      const batches = conteudo
        .split(/^\s*GO\s*;?\s*$/gim)
        .map((b) => b.trim())
        .filter(Boolean);
      for (const batch of batches) {
        await conn.request().batch(batch);
      }
      await conn
        .request()
        .input('nome', sql.NVarChar(190), arquivo)
        .query('INSERT INTO schema_migrations (nome) VALUES (@nome)');
      console.log(`+ ${arquivo} aplicada`);
    }
    console.log('Banco pronto.');
  } finally {
    await conn.close();
  }
} catch (erro) {
  console.error('Falha na migração:', erro.code ? `${erro.code}: ${erro.message}` : erro.message);
  process.exitCode = 1;
}
