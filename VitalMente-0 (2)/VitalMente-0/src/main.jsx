import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./login/login.jsx";
import App from "./inicio/App.jsx";
import Explorar from "./explorar/explorar.jsx";
import Notificacoes from "./notificacoes/notificacoes.jsx";
import Historico from "./historico/historico.jsx";
import EditarConta from "./editarConta/editarConta.jsx";
import Clientes from "./clientes/clientes.jsx";
import Escola from "./escola/Escola.jsx";

import "./login/index.css";
import "./inicio/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>

    <BrowserRouter>

      <Routes>

        {/* =================================
            LOGIN
        ================================= */}

        <Route
          path="/"
          element={<Login />}
        />

        {/* =================================
            PÁGINA INICIAL
        ================================= */}

        <Route
          path="/home"
          element={<App />}
        />

        {/* =================================
            EXPLORAR
        ================================= */}

        <Route
          path="/explorar"
          element={<Explorar />}
        />

        {/* =================================
            NOTIFICAÇÕES
        ================================= */}

        <Route
          path="/notificacoes"
          element={<Notificacoes />}
        />

        {/* =================================
            HISTÓRICO
        ================================= */}

        <Route
          path="/historico"
          element={<Historico />}
        />

        {/* =================================
            PERFIL
        ================================= */}

        <Route
          path="/editar-conta"
          element={<EditarConta />}
        />

        {/* =================================
            CLIENTES (exemplo SQL Server)
        ================================= */}

        <Route
          path="/clientes"
          element={<Clientes />}
        />

        {/* ================================
            ESCOLA
        ================================= */}
        <Route
          path="/escola"
          element={<Escola />}
        />

      </Routes>

    </BrowserRouter>

  </StrictMode>
);