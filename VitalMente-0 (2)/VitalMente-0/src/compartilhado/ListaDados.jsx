import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { inicialDe } from "./useDados.js";
import "./dados.css";

function quando(iso) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// modo: "feed" | "explorar" (publicações) | "historico" | "notificacoes".
// "vazio" é o bloco original da página (mantido igual) exibido quando não há dados.
export default function ListaDados({ modo, usuario, carregandoSessao, vazio, busca = "" }) {
  const [itens, setItens] = useState([]);
  const [proximo, setProximo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const precisaLogin = modo === "historico" || modo === "notificacoes";
  const usuarioId = usuario?.id;

  const carregar = useCallback(
    async (cursor = null) => {
      try {
        let dados;
        if (modo === "historico") dados = await api("/historico");
        else if (modo === "notificacoes") {
          dados = await api("/notificacoes");
          api("/notificacoes/marcar-lidas", { metodo: "POST", corpo: {} })
            .then(() => window.dispatchEvent(new Event("vitalmente:lidas")))
            .catch(() => {});
        } else {
          const p = new URLSearchParams();
          if (cursor) p.set("antesDe", cursor);
          if (busca) p.set("q", busca);
          dados = await api(`/publicacoes?${p}`);
        }
        setItens((atual) => (cursor ? [...atual, ...dados.itens] : dados.itens));
        setProximo(dados.proximo ?? null);
        setErro("");
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    },
    [modo, busca]
  );

  useEffect(() => {
    if (carregandoSessao) return;
    if (precisaLogin && !usuarioId) return;
    carregar();
  }, [carregar, carregandoSessao, precisaLogin, usuarioId]);

  // Atualiza a lista quando uma publicação é criada pelo modal.
  useEffect(() => {
    if (modo !== "feed" && modo !== "explorar") return;
    const aoPublicar = () => carregar();
    window.addEventListener("vitalmente:publicado", aoPublicar);
    return () => window.removeEventListener("vitalmente:publicado", aoPublicar);
  }, [modo, carregar]);

  async function excluir(id) {
    if (!window.confirm("Excluir esta publicação?")) return;
    try {
      await api(`/publicacoes/${id}`, { metodo: "DELETE" });
      setItens((atual) => atual.filter((i) => i.id !== id));
    } catch (e) {
      setErro(e.message);
    }
  }

  if (carregandoSessao || (carregando && !(precisaLogin && !usuarioId))) {
    return <p className="dados-estado">Carregando...</p>;
  }
  if (precisaLogin && !usuarioId) return vazio;
  if (erro && itens.length === 0) return <p className="dados-estado">{erro}</p>;
  if (itens.length === 0) return vazio;

  return (
    <section className="dados-lista">
      {erro && <p className="dados-erro">{erro}</p>}
      {modo === "historico" &&
        itens.map((i) => (
          <article key={i.id} className="dados-item">
            <div className="dados-corpo">
              <p className="dados-texto">{i.descricao}</p>
              <span className="dados-data">{quando(i.criadoEm)}</span>
            </div>
          </article>
        ))}
      {modo === "notificacoes" &&
        itens.map((i) => (
          <article key={i.id} className={`dados-item ${i.lida ? "" : "dados-nao-lida"}`}>
            <div className="dados-corpo">
              <strong>{i.titulo}</strong>
              <p className="dados-texto">{i.mensagem}</p>
              <span className="dados-data">{quando(i.criadoEm)}</span>
            </div>
          </article>
        ))}
      {(modo === "feed" || modo === "explorar") &&
        itens.map((p) => (
          <article key={p.id} className="dados-item">
            <div className="dados-avatar">{inicialDe(p.autor.nome)}</div>
            <div className="dados-corpo">
              <div className="dados-topo">
                <strong>{p.autor.nome}</strong>
                <span>@{p.autor.username}</span>
                <span className="dados-data">· {quando(p.criadoEm)}</span>
                {p.minha && (
                  <button type="button" className="dados-excluir" onClick={() => excluir(p.id)}>
                    Excluir
                  </button>
                )}
              </div>
              <p className="dados-texto">{p.texto}</p>
              {(p.categoria || p.sentimento) && (
                <div className="dados-tags">
                  {p.categoria && <span className="dados-tag">{p.categoria}</span>}
                  {p.sentimento && <span className="dados-tag">{p.sentimento}</span>}
                </div>
              )}
            </div>
          </article>
        ))}
      {proximo && (
        <button type="button" className="dados-mais" onClick={() => carregar(proximo)}>
          Carregar mais
        </button>
      )}
    </section>
  );
}
