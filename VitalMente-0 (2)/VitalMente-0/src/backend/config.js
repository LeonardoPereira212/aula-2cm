// Configuração central, toda lida de variáveis de ambiente (ver .env.example).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Carrega o .env da pasta src/backend/ independente do diretório de trabalho
// (npm run db:migrate / server roda a partir da raiz do projeto).
const dirBackend = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dirBackend, '.env') });

const emProducao = process.env.NODE_ENV === 'production';

function lista(valor, padrao) {
  return (valor ?? padrao)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  emProducao,
  porta: Number(process.env.PORT || 3000),
  db: {
    server: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME || 'vitalmente',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
    },
    pool: {
      max: Number(process.env.DB_POOL_SIZE || 10),
    },
  },
  // Origens do frontend autorizadas (CORS + checagem de Origin contra CSRF).
  origensPermitidas: lista(process.env.CORS_ORIGIN, 'http://localhost:5173'),
  sessao: {
    cookie: 'vm_sessao',
    duracaoDias: Number(process.env.SESSION_DAYS || 7),
    // "lax" serve quando front e API ficam no mesmo site (ou atrás do proxy do Vite).
    // Se estiverem em domínios diferentes em produção use COOKIE_SAMESITE=none (exige HTTPS).
    sameSite: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : emProducao,
  },
  trustProxy: process.env.TRUST_PROXY === 'true',
  servirFrontend: process.env.SERVE_FRONTEND === 'true',
};
