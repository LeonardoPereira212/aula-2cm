import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../compartilhado/api.js";
import { inicialDe } from "../compartilhado/useDados.js";
import "../compartilhado/dados.css";
import "./editarConta.css";

function EditarConta() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nomeSalvo, setNomeSalvo] = useState("");
  const [logado, setLogado] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  useEffect(() => {
    let ativo = true;

    api("/auth/me")
      .then(({ usuario }) => {
        if (!ativo || !usuario) return;
        setLogado(true);
        setNome(usuario.nome);
        setNomeSalvo(usuario.nome);
        setEmail(usuario.email);
        setTelefone(usuario.telefone);
      })
      .catch((e) => ativo && setMensagem({ tipo: "erro", texto: e.message }));

    return () => {
      ativo = false;
    };
  }, []);

  async function handleSalvar() {
    if (!logado) {
      setMensagem({ tipo: "erro", texto: "Faça login para editar sua conta." });
      return;
    }

    try {
      setSalvando(true);
      setMensagem({ tipo: "", texto: "" });

      const { usuario } = await api("/usuarios/me", {
        metodo: "PATCH",
        corpo: { nome, email, telefone },
      });

      setNomeSalvo(usuario.nome);
      setMensagem({ tipo: "ok", texto: "Alterações salvas com sucesso." });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e.message });
    } finally {
      setSalvando(false);
    }
  }

  async function handleAlterarSenha() {
    try {
      setSalvando(true);
      setMensagem({ tipo: "", texto: "" });

      await api("/usuarios/me/senha", {
        metodo: "PUT",
        corpo: { senhaAtual, novaSenha },
      });

      setSenhaAtual("");
      setNovaSenha("");
      setMostrarSenha(false);
      setMensagem({ tipo: "ok", texto: "Senha alterada com sucesso." });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e.message });
    } finally {
      setSalvando(false);
    }
  }

  async function handleSair() {
    try {
      await api("/auth/logout", { metodo: "POST", corpo: {} });
    } catch {
      /* mesmo com falha, volta ao login; a sessão expira sozinha */
    }

    navigate("/");
  }

  function handleVoltar() {
    navigate("/home");
  }

  return (
    <div className="account-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="account-header">

        <button
          type="button"
          className="back-button"
          onClick={handleVoltar}
          aria-label="Voltar"
        >
          ←
        </button>

        <div className="header-content">

          <span className="account-eyebrow">
            CONFIGURAÇÕES
          </span>

          <h1>
            Editar conta
          </h1>

          <p>
            Atualize suas informações pessoais e mantenha
            sua conta sempre atualizada.
          </p>

        </div>

      </header>


      {/* =========================================
          CONTEÚDO
      ========================================= */}

      <main className="account-content">

        {/* =========================================
            PERFIL
        ========================================= */}

        <section className="profile-card">

          <div className="profile-avatar-large">
            {inicialDe(nomeSalvo || "Visitante")}
          </div>

          <div className="profile-details">

            <h2>
              {nomeSalvo || "Visitante"}
            </h2>

            <p>
              Informações da sua conta
            </p>

            <button
              type="button"
              className="change-photo-button"
            >
              Alterar foto
            </button>

          </div>

        </section>


        {/* =========================================
            INFORMAÇÕES PESSOAIS
        ========================================= */}

        <section className="settings-card">

          <div className="section-heading">

            <span className="section-number">
              01
            </span>

            <div>

              <h2>
                Informações pessoais
              </h2>

              <p>
                Essas informações serão utilizadas para
                identificar sua conta.
              </p>

            </div>

          </div>


          <div className="form-grid">

            {/* NOME */}

            <div className="form-group">

              <label htmlFor="nome">
                Nome completo
              </label>

              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) =>
                  setNome(e.target.value)
                }
                placeholder="Digite seu nome"
              />

            </div>


            {/* EMAIL */}

            <div className="form-group">

              <label htmlFor="email">
                E-mail
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="seuemail@email.com"
              />

            </div>


            {/* TELEFONE */}

            <div className="form-group">

              <label htmlFor="telefone">
                Telefone
              </label>

              <input
                id="telefone"
                type="tel"
                value={telefone}
                onChange={(e) =>
                  setTelefone(e.target.value)
                }
                placeholder="(00) 00000-0000"
              />

            </div>

          </div>

        </section>


        {/* =========================================
            SENHA
        ========================================= */}

        <section className="settings-card">

          <div className="section-heading">

            <span className="section-number">
              02
            </span>

            <div>

              <h2>
                Senha
              </h2>

              <p>
                Altere sua senha para manter sua conta segura.
              </p>

            </div>

          </div>

          {mostrarSenha && (
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="senhaAtual">Senha atual</label>

                <input
                  id="senhaAtual"
                  type="password"
                  autoComplete="current-password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="novaSenha">Nova senha (mínimo 8 caracteres)</label>

                <input
                  id="novaSenha"
                  type="password"
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className="secondary-button"
            disabled={salvando}
            onClick={() => {
              if (!logado) {
                setMensagem({ tipo: "erro", texto: "Faça login para alterar a senha." });
              } else if (!mostrarSenha) {
                setMostrarSenha(true);
              } else {
                handleAlterarSenha();
              }
            }}
          >
            {mostrarSenha ? "Salvar nova senha" : "Alterar senha"}
          </button>

        </section>


        {mensagem.texto && (
          <p
            className="dados-erro"
            style={mensagem.tipo === "ok" ? { color: "#00ba7c" } : undefined}
            role="status"
          >
            {mensagem.texto}
          </p>
        )}

        {/* =========================================
            AÇÕES
        ========================================= */}

        <section className="actions-card">

          <button
            type="button"
            className="cancel-button"
            onClick={handleVoltar}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="save-button"
            disabled={salvando}
            onClick={handleSalvar}
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>

        </section>


        {/* =========================================
            SAIR
        ========================================= */}

        <section className="logout-card">

          <div>

            <h2>
              Sair da conta
            </h2>

            <p>
              Encerre sua sessão neste dispositivo.
            </p>

          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleSair}
          >
            Sair
          </button>

        </section>

      </main>


      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="account-footer">

        <strong>
          VitalMente
        </strong>

        <span>
          •
        </span>

        <span>
          Sua saúde começa pela sua mente.
        </span>

      </footer>

    </div>
  );
}

export default EditarConta;