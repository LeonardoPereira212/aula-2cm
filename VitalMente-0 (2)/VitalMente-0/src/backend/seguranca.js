// Hash de senha (scrypt nativo do Node), tokens de sessão e cookies.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const N = 16384;
const KEYLEN = 64;

export async function hashSenha(senha) {
  const salt = crypto.randomBytes(16);
  const derivada = await scrypt(senha, salt, KEYLEN, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString('base64')}$${derivada.toString('base64')}`;
}

export async function verificarSenha(senha, armazenado) {
  try {
    const [esquema, n, saltB64, hashB64] = String(armazenado).split('$');
    if (esquema !== 'scrypt') return false;
    const esperado = Buffer.from(hashB64, 'base64');
    const obtido = await scrypt(senha, Buffer.from(saltB64, 'base64'), esperado.length, {
      N: Number(n),
      r: 8,
      p: 1,
    });
    return crypto.timingSafeEqual(esperado, obtido);
  } catch {
    return false;
  }
}

// Usado quando o usuário não existe, para não revelar isso pelo tempo de resposta.
export const HASH_FALSO =
  'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(KEYLEN).toString('base64');

export function novoToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// Só o hash do token fica no banco; um vazamento do banco não entrega sessões válidas.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function lerCookies(header = '') {
  const saida = {};
  for (const parte of header.split(';')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    const chave = parte.slice(0, i).trim();
    try {
      saida[chave] = decodeURIComponent(parte.slice(i + 1).trim());
    } catch {
      /* cookie malformado é ignorado */
    }
  }
  return saida;
}
