import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { cabecalhosSeguros, carregarSessao, protecaoCsrf, tratarErros } from './middleware.js';
import { rotasAuth } from './routes/auth.js';
import { rotasUsuarios } from './routes/usuarios.js';
import { rotasPublicacoes } from './routes/publicacoes.js';
import { rotasAssuntos, rotasClientes, rotasHistorico, rotasNotificacoes } from './routes/painel.js';
import { rotasEscola } from './routes/escola.js';

// A fábrica recebe o pool para permitir testes com um banco simulado.
export function criarApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(cabecalhosSeguros);
  app.use(
    cors({
      origin(origem, cb) {
        // Sem Origin (mesmo site, curl) ou origem autorizada.
        cb(null, !origem || config.origensPermitidas.includes(origem));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/status', async (req, res) => {
    try {
      await pool.request().query('SELECT 1 AS resultado');
      res.json({ mensagem: 'API conectada ao SQL Server!' });
    } catch (erro) {
      console.error('Erro SQL Server:', erro.code || erro.message);
      res.status(503).json({ erro: 'Falha na conexão com o banco.' });
    }
  });

  app.use('/api', protecaoCsrf, carregarSessao(pool));
  app.use('/api/auth', rotasAuth(pool));
  app.use('/api/usuarios', rotasUsuarios(pool));
  app.use('/api/publicacoes', rotasPublicacoes(pool));
  app.use('/api/notificacoes', rotasNotificacoes(pool));
  app.use('/api/historico', rotasHistorico(pool));
  app.use('/api/assuntos', rotasAssuntos(pool));
  app.use('/api/clientes', rotasClientes(pool));
  app.use('/api/escola', rotasEscola(pool));
  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  // Produção em um único servidor: Express também entrega o site compilado (npm run build).
  if (config.servirFrontend) {
    const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
    if (fs.existsSync(dist)) {
      app.use(express.static(dist));
      app.get('/{*rota}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
    }
  }

  app.use(tratarErros);
  return app;
}
