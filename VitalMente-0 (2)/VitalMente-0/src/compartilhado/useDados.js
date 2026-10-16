import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

// Usuário logado (null = visitante) e contagem de notificações não lidas.
export function useSessao() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    let ativo = true;
    api("/auth/me")
      .then(async ({ usuario: u }) => {
        if (!ativo) return;
        setUsuario(u);
        if (u) {
          const { total } = await api("/notificacoes/nao-lidas").catch(() => ({ total: 0 }));
          if (ativo) setNaoLidas(total);
        }
      })
      .catch(() => {})
      .finally(() => ativo && setCarregando(false));
    const zerar = () => setNaoLidas(0);
    window.addEventListener("vitalmente:lidas", zerar);
    return () => {
      ativo = false;
      window.removeEventListener("vitalmente:lidas", zerar);
    };
  }, []);

  return { usuario, setUsuario, carregando, naoLidas };
}

// Contagem de publicações por assunto ("O que está acontecendo").
export function useAssuntos() {
  const [mapa, setMapa] = useState({});
  useEffect(() => {
    let ativo = true;
    api("/assuntos")
      .then(({ itens }) => {
        if (ativo) setMapa(Object.fromEntries(itens.map((a) => [a.titulo, a.publicacoes])));
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);
  const textoPosts = useCallback(
    (titulo) => {
      const n = mapa[titulo] ?? 0;
      return `${n} ${n === 1 ? "publicação" : "publicações"}`;
    },
    [mapa]
  );
  return textoPosts;
}

export function inicialDe(nome) {
  return (nome || "?").trim().charAt(0).toUpperCase();
}
