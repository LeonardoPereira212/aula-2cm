// Conexão centralizada com o SQL Server (pool único).
import sql from 'mssql';
import { config } from './config.js';

let poolGlobal = null;

// Converte placeholders "?" para parâmetros nomeados do SQL Server (@p0, @p1, ...)
function prepararSql(sql, params = []) {
  let idx = 0;
  const sqlComParams = sql.replace(/\?/g, () => `@p${idx++}`);
  return { sql: sqlComParams, params };
}

// Executa uma query parametrizada no pool. Retorna [linhas, affectedRows?].
export async function executar(pool, sql, params = []) {
  const { sql: sqlFinal, params: paramsNomeados } = prepararSql(sql, params);
  const request = pool.request();
  paramsNomeados.forEach((valor, i) => {
    request.input(`p${i}`, valor);
  });
  const resultado = await request.query(sqlFinal);
  return [resultado.recordset, resultado.rowsAffected[0] || 0];
}

// Cria o pool de conexões SQL Server.
export async function criarPool() {
  if (poolGlobal) return poolGlobal;
  const pool = new sql.ConnectionPool({
    server: config.db.server,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    options: config.db.options,
    pool: config.db.pool,
  });
  await pool.connect();
  poolGlobal = pool;
  return pool;
}

// Fecha o pool.
export async function fecharPool() {
  if (poolGlobal) {
    await poolGlobal.close();
    poolGlobal = null;
  }
}

// Executa fn dentro de uma transação (commit/rollback automáticos).
export async function transacao(pool, fn) {
  // Banco falso dos testes expõe pool.transacao(fn) (o sql.Transaction real não o aceita).
  if (typeof pool.transacao === 'function') return pool.transacao(fn);
  const transacao = new sql.Transaction(pool);
  await transacao.begin();
  try {
    const resultado = await fn(transacao);
    await transacao.commit();
    return resultado;
  } catch (erro) {
    try {
      await transacao.rollback();
    } catch {
      /* transação já perdida */
    }
    throw erro;
  }
}
