import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../compartilhado/api.js";

import "./clientes.css";


function Clientes() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarClientes() {
    try {
      const dados = await api("/clientes");
      setClientes(dados);
      setErro("");
    } catch (e) {
      console.error(e);
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!nome.trim() || !email.trim()) return;

    try {
      setSalvando(true);
      setErro("");

      await api("/clientes", {
        metodo: "POST",
        corpo: { nome: nome.trim(), email: email.trim() },
      });

      setNome("");
      setEmail("");
      await carregarClientes();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="clientes-page">
      <header className="clientes-header">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/home")}
          aria-label="Voltar"
        >
          ←
        </button>

        <div>
          <span className="clientes-eyebrow">SQL SERVER</span>
          <h1>Clientes</h1>
          <p>Exemplo de integração do site com o banco de dados.</p>
        </div>
      </header>

      <main className="clientes-content">
        <section className="clientes-card">
          <h2>Cadastrar cliente</h2>

          <form className="clientes-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <button
              type="submit"
              className={`save-button ${
                nome.trim() && email.trim() ? "active" : ""
              }`}
              disabled={salvando || !nome.trim() || !email.trim()}
            >
              {salvando ? "Salvando..." : "Cadastrar"}
            </button>
          </form>

          {erro && <p className="clientes-erro">{erro}</p>}
        </section>

        <section className="clientes-card">
          <div className="clientes-list-head">
            <h2>Lista de clientes</h2>
            <button
              type="button"
              className="refresh-button"
              onClick={carregarClientes}
            >
              Atualizar
            </button>
          </div>

          {carregando ? (
            <p className="clientes-vazio">Carregando...</p>
          ) : clientes.length === 0 ? (
            <p className="clientes-vazio">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <ul className="clientes-lista">
              {clientes.map((cliente) => (
                <li key={cliente.id} className="cliente-item">
                  <span className="cliente-nome">{cliente.nome}</span>
                  <span className="cliente-email">{cliente.email}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default Clientes;
