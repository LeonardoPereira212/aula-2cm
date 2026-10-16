import { criarApp } from './app.js';
import { config } from './config.js';
import { criarPool, fecharPool } from './db.js';

criarPool()
  .then((pool) => {
    const app = criarApp(pool);
    app.listen(config.porta, () => {
      console.log(`Backend rodando em http://localhost:${config.porta}`);
    });
  })
  .catch((erro) => {
    console.error('Falha ao conectar ao SQL Server:', erro.message);
    process.exit(1);
  });

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, async () => {
    await fecharPool().catch(() => {});
    process.exit(0);
  });
}
