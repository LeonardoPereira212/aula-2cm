import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../compartilhado/api.js";
import "../compartilhado/dados.css";

const BRAIN_IMAGE =
  "https://www.nicepng.com/png/full/473-4738733_brain-icons-simple-brain-line-drawing.png";

function BrainLogo({ className = "" }) {
  return (
    <img
      className={`brain-logo ${className}`}
      src={BRAIN_IMAGE}
      alt="Logo cérebro"
    />
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.68-.06-1.34-.18-1.97H12v3.73h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.15z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.52A9.74 9.74 0 0 0 12 21.5z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.59a5.85 5.85 0 0 1 0-3.18V7.89H3.28a9.5 9.5 0 0 0 0 8.22l3.25-2.52z"
      />
      <path
        fill="#EA4335"
        d="M12 6.38c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.43 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.72 5.39l3.25 2.52C7.3 8.1 9.46 6.38 12 6.38z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.54c-.02-2.3 1.88-3.41 1.96-3.46a4.2 4.2 0 0 0-3.32-1.8c-1.4-.14-2.73.83-3.44.83-.72 0-1.82-.81-2.99-.79a4.42 4.42 0 0 0-3.72 2.27c-1.61 2.79-.41 6.9 1.16 9.16.77 1.1 1.67 2.32 2.86 2.27 1.15-.05 1.58-.74 2.97-.74s1.78.74 2.98.71c1.24-.02 2.02-1.1 2.78-2.21a9.1 9.1 0 0 0 1.27-2.56 3.96 3.96 0 0 1-2.51-3.68z" />
      <path d="M14.75 5.82a4.07 4.07 0 0 0 .93-2.92 4.15 4.15 0 0 0-2.68 1.39 3.9 3.9 0 0 0-.96 2.81c1.02.08 2.06-.52 2.71-1.28z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [phoneModal, setPhoneModal] = useState(false);
  const [phone, setPhone] = useState("");

  const [senha, setSenha] = useState("");
  const [etapaSenha, setEtapaSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [cadastroModal, setCadastroModal] = useState(false);
  const [cadastro, setCadastro] = useState({
    nome: "",
    username: "",
    email: "",
    senha: "",
  });
  const [erroCadastro, setErroCadastro] = useState("");

  const handleContinue = async () => {
    if (!username.trim() || enviando) return;

    if (!etapaSenha) {
      setEtapaSenha(true);
      return;
    }

    if (!senha) return;

    try {
      setEnviando(true);
      setErro("");

      await api("/auth/login", {
        metodo: "POST",
        corpo: { identificador: username, senha },
      });

      navigate("/home");
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleCadastrar = async () => {
    if (enviando) return;

    try {
      setEnviando(true);
      setErroCadastro("");

      await api("/auth/registro", {
        metodo: "POST",
        corpo: cadastro,
      });

      navigate("/home");
    } catch (e) {
      setErroCadastro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const cadastroCompleto =
    cadastro.nome.trim() &&
    cadastro.username.trim() &&
    cadastro.email.trim() &&
    cadastro.senha;

  const handleSocialLogin = (provider) => {
    alert(`Login com ${provider}`);
  };

  const handleContinueWithoutAccount = () => {
    navigate("/home");
  };

  const handlePhoneContinue = () => {
    if (!phone.trim()) return;

    alert(`Código enviado para: ${phone}`);
  };

  return (
    <main className="login-page">
      <section className="brand-section">
        <div className="brand-content">
          <div className="brand-logo-wrap">
            <BrainLogo />
          </div>

          <h2 className="brand-title">
            Sua mente.
            <br />
            Seu espaço.
          </h2>

          <p className="brand-description">
            Conecte-se, compartilhe ideias e acompanhe
            o que está acontecendo ao seu redor.
          </p>
        </div>
      </section>

      <section className="login-section">
        <div className="login-container">
          <div className="mobile-brand">
            <BrainLogo />
          </div>

          <div className="login-heading">
            <span className="eyebrow">BEM-VINDO</span>

            <h1>
              Bem
              <br />
              Vindo!
            </h1>

            <p className="login-subtitle">
              Entre na sua conta ou comece agora.
            </p>
          </div>

          <div className="auth-buttons">
            <button
              className="login-button phone-button"
              onClick={() => setPhoneModal(true)}
            >
              <PhoneIcon />
              <span>Continuar com telefone</span>
            </button>

            <button
              className="login-button"
              onClick={() => handleSocialLogin("Google")}
            >
              <GoogleIcon />
              <span>Continuar com o Google</span>
            </button>

            <button
              className="guest-button"
              onClick={handleContinueWithoutAccount}
            >
              Continuar sem conta
            </button>
          </div>

          <div className="divider">
            <span />
            <p>ou</p>
            <span />
          </div>

          <div className="form-group">
            <label htmlFor="username">
              E-mail ou nome de utilizador
            </label>

            <input
              id="username"
              type="text"
              placeholder="Digite seu e-mail ou utilizador"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setEtapaSenha(false);
                setSenha("");
                setErro("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleContinue();
                }
              }}
            />
          </div>

          {etapaSenha && (
            <div className="form-group">
              <label htmlFor="senha">Senha</label>

              <input
                id="senha"
                type="password"
                autoFocus
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleContinue();
                  }
                }}
              />
            </div>
          )}

          {erro && <p className="dados-erro">{erro}</p>}

          <button
            className={`continue-button ${
              username.trim() && (!etapaSenha || senha) ? "active" : ""
            }`}
            onClick={handleContinue}
            disabled={!username.trim() || enviando || (etapaSenha && !senha)}
          >
            Continuar
          </button>

          <p className="terms">
            Ao continuar, concordas com os nossos{" "}
            <a href="#">Termos de Serviço</a>,{" "}
            <a href="#">Política de Privacidade</a> e{" "}
            <a href="#">Uso de cookies</a>.
          </p>

          <p className="login-link">
            Não tem conta?{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setCadastroModal(true);
              }}
            >
              Cadastrar-se
            </a>
          </p>
        </div>
      </section>

      {phoneModal && (
        <div
          className="phone-overlay"
          onMouseDown={() => setPhoneModal(false)}
        >
          <div
            className="phone-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <button
                className="back-button"
                onClick={() => setPhoneModal(false)}
                aria-label="Voltar"
              >
                ←
              </button>

              <BrainLogo />
            </div>

            <div className="modal-content">
              <span className="modal-eyebrow">
                VERIFICAÇÃO
              </span>

              <h2>
                Insira seu número
                <br />
                de telefone
              </h2>

              <p className="modal-description">
                Usaremos seu número para verificar
                sua identidade e proteger sua conta.
              </p>

              <div className="phone-input-wrapper">
                <div className="country">
                  <span>🇧🇷</span>
                  <strong>+55</strong>
                  <span className="arrow">⌄</span>
                </div>

                <input
                  autoFocus
                  type="tel"
                  placeholder="Número de telefone"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                />
              </div>

              <p className="sms-info">
                Vamos enviar um código de verificação
                por SMS. Podem ser aplicadas tarifas
                da sua operadora.
              </p>

              <button
                className={`modal-continue ${
                  phone.trim() ? "active" : ""
                }`}
                disabled={!phone.trim()}
                onClick={handlePhoneContinue}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
      {cadastroModal && (
        <div
          className="phone-overlay"
          onMouseDown={() => setCadastroModal(false)}
        >
          <div
            className="phone-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <button
                className="back-button"
                onClick={() => setCadastroModal(false)}
                aria-label="Voltar"
              >
                ←
              </button>

              <BrainLogo />
            </div>

            <div className="modal-content">
              <span className="modal-eyebrow">CADASTRO</span>

              <h2>Crie sua conta</h2>

              {[
                ["nome", "Nome", "text", "name"],
                ["username", "Nome de utilizador", "text", "username"],
                ["email", "E-mail", "email", "email"],
                ["senha", "Senha (mínimo 8 caracteres)", "password", "new-password"],
              ].map(([campo, rotulo, tipo, auto]) => (
                <div className="form-group" key={campo}>
                  <label htmlFor={`cad-${campo}`}>{rotulo}</label>

                  <input
                    id={`cad-${campo}`}
                    type={tipo}
                    autoComplete={auto}
                    value={cadastro[campo]}
                    onChange={(event) =>
                      setCadastro({ ...cadastro, [campo]: event.target.value })
                    }
                  />
                </div>
              ))}

              {erroCadastro && <p className="dados-erro">{erroCadastro}</p>}

              <button
                className={`modal-continue ${cadastroCompleto ? "active" : ""}`}
                disabled={!cadastroCompleto || enviando}
                onClick={handleCadastrar}
              >
                Criar conta
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Login;