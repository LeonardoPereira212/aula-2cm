// Cliente da API. Em desenvolvimento o Vite encaminha /api para o backend (vite.config.js);
// se o backend ficar em outro domínio, defina VITE_API_URL (ex.: https://api.seusite.com/api).
const BASE = import.meta.env.VITE_API_URL || "/api";

export class ErroApi extends Error {
  constructor(mensagem, status, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos || {};
  }
}

export async function api(caminho, { metodo = "GET", corpo } = {}) {
  let resposta;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      credentials: "include",
      headers: {
        "X-Requested-With": "vitalmente",
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi("Não foi possível conectar ao servidor. Tente novamente.", 0);
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new ErroApi(dados.erro || "Ocorreu um erro. Tente novamente.", resposta.status, dados.campos);
  }
  return dados;
}
