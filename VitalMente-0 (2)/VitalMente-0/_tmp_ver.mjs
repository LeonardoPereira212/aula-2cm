import sql from 'mssql';
import { config } from './src/backend/config.js';
try {
  const p = await new sql.ConnectionPool({
    server: config.db.server, port: config.db.port, database: config.db.database,
    user: config.db.user, password: config.db.password, options: config.db.options,
  }).connect();
  const t = await p.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  console.log('TABELAS:', t.recordset.map((r) => r.TABLE_NAME).join(', ') || '(nenhuma)');
  try {
    const m = await p.request().query('SELECT nome FROM schema_migrations');
    console.log('MIGRATIONS:', m.recordset.map((r) => r.nome).join(', '));
  } catch { console.log('MIGRATIONS: (tabela schema_migrations nao existe)'); }
  await p.close();
} catch (e) { console.log('ERRO:', e.code, '|', e.message); }
