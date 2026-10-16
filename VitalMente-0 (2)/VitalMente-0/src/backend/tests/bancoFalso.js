// Banco SIMULADO em memória, só para testar a lógica das rotas sem SQL Server.
// Ele NÃO valida o SQL real: ver o relatório de testes sobre o que continua exigindo SQL Server de verdade.
// Espelha a superfície usada por db.executar: pool.request().input(nome, valor).query(sql)
// retornando { recordset, rowsAffected } como o driver mssql.

export function criarBancoFalso() {
  const t = { usuarios: [], sessoes: [], publicacoes: [], notificacoes: [], historico: [] };
  let seq = 0;

  // Erro no formato do mssql para violação de chave única (número 2627).
  const dup = (constraint, tabela) =>
    Object.assign(
      new Error(
        `Violation of UNIQUE KEY constraint '${constraint}'. Cannot insert duplicate key in object 'dbo.${tabela}'.`
      ),
      { code: 'EREQUEST', number: 2627, state: 1 }
    );

  // Interpreta os SQLs emitidos pelas rotas (os parâmetros @p0, @p1... voltam a
  // ser um array posicional) e devolve { recordset, rowsAffected } como o driver real.
  async function rodar(sql, p) {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('SELECT 1 AS resultado')) return { recordset: [{ resultado: 1 }], rowsAffected: [1] };

    if (s.startsWith('INSERT INTO usuarios')) {
      const [nome, username, email, senha_hash] = p;
      if (t.usuarios.some((u) => u.email === email)) throw dup('uq_usuarios_email', 'usuarios');
      if (t.usuarios.some((u) => u.username === username)) throw dup('uq_usuarios_username', 'usuarios');
      const u = { id: ++seq, nome, username, email, telefone: null, senha_hash, papel: 'aluno', tipo_assinatura: 'free' };
      t.usuarios.push(u);
      // Rotas usam "...; SELECT SCOPE_IDENTITY() AS id" ou OUTPUT INSERTED.id.
      return { recordset: [{ id: u.id }], rowsAffected: [1] };
    }
    if (s.startsWith('INSERT INTO sessoes')) {
      t.sessoes.push({ id: ++seq, usuario_id: p[0], token_hash: p[1], user_agent: p[2] ?? null, expira_em: p[3] });
      return { recordset: [], rowsAffected: [1] };
    }
    if (s.startsWith('INSERT INTO notificacoes')) {
      t.notificacoes.push({ id: ++seq, usuario_id: p[0], tipo: p[1], titulo: p[2], mensagem: p[3], lida: 0, criado_em: new Date() });
      return { recordset: [], rowsAffected: [1] };
    }
    if (s.startsWith('INSERT INTO historico')) {
      t.historico.push({ id: ++seq, usuario_id: p[0], tipo: p[1], descricao: p[2], referencia_id: p[3] ?? null, criado_em: new Date() });
      return { recordset: [], rowsAffected: [1] };
    }
    if (s.startsWith('SELECT u.id, u.nome') && s.includes('FROM sessoes s JOIN usuarios u')) {
      const ss = t.sessoes.find((x) => x.token_hash === p[0] && x.expira_em > new Date());
      const u = ss && t.usuarios.find((x) => x.id === ss.usuario_id);
      return { recordset: u ? [{ ...u, sessao_id: ss.id }] : [], rowsAffected: [1] };
    }
    if (s.startsWith('SELECT id, nome, username, email, telefone, senha_hash')) {
      return { recordset: t.usuarios.filter((u) => u.email === p[0] || u.username === p[1]).slice(0, 1), rowsAffected: [1] };
    }
    if (s.startsWith('DELETE FROM sessoes WHERE expira_em')) return { recordset: [], rowsAffected: [0] };
    if (s.startsWith('DELETE FROM sessoes WHERE token_hash')) {
      const antes = t.sessoes.length;
      t.sessoes = t.sessoes.filter((x) => x.token_hash !== p[0]);
      return { recordset: [], rowsAffected: [antes - t.sessoes.length] };
    }
    if (s.startsWith('DELETE FROM sessoes WHERE usuario_id')) {
      const antes = t.sessoes.length;
      t.sessoes = t.sessoes.filter((x) => x.usuario_id !== p[0] || x.token_hash === p[1]);
      return { recordset: [], rowsAffected: [antes - t.sessoes.length] };
    }
    if (s.startsWith('SELECT senha_hash FROM usuarios')) {
      return { recordset: t.usuarios.filter((u) => u.id === p[0]).map((u) => ({ senha_hash: u.senha_hash })), rowsAffected: [1] };
    }
    if (s.startsWith('UPDATE usuarios SET senha_hash')) {
      t.usuarios.find((u) => u.id === p[1]).senha_hash = p[0];
      return { recordset: [], rowsAffected: [1] };
    }
    if (s.startsWith('UPDATE usuarios SET papel')) {
      t.usuarios.find((u) => u.id === p[1]).papel = p[0];
      return { recordset: [], rowsAffected: [1] };
    }
    if (s.startsWith('UPDATE usuarios SET nome')) {
      if (t.usuarios.some((u) => u.email === p[1] && u.id !== p[3])) throw dup('uq_usuarios_email', 'usuarios');
      Object.assign(t.usuarios.find((u) => u.id === p[3]), { nome: p[0], email: p[1], telefone: p[2] });
      return { recordset: [], rowsAffected: [1] };
    }
    if (s.startsWith('SELECT id FROM publicacoes WHERE usuario_id')) {
      return { recordset: t.publicacoes.filter((x) => x.usuario_id === p[0] && x.texto === p[1]).slice(0, 1), rowsAffected: [1] };
    }
    if (s.startsWith('INSERT INTO publicacoes')) {
      const x = { id: ++seq, usuario_id: p[0], texto: p[1], sentimento: p[2] ?? null, categoria: p[3] ?? null, criado_em: new Date() };
      t.publicacoes.push(x);
      // A rota usa OUTPUT INSERTED.id AS id.
      return { recordset: [{ id: x.id }], rowsAffected: [1] };
    }
    if (s.startsWith('DELETE FROM publicacoes')) {
      const antes = t.publicacoes.length;
      t.publicacoes = t.publicacoes.filter((x) => !(x.id === p[0] && x.usuario_id === p[1]));
      return { recordset: [], rowsAffected: [antes - t.publicacoes.length] };
    }
    if (s.includes('FROM publicacoes p JOIN usuarios u')) {
      const linhas = [...t.publicacoes].reverse().map((x) => {
        const u = t.usuarios.find((y) => y.id === x.usuario_id);
        return { ...x, autor_nome: u?.nome, autor_username: u?.username };
      });
      return { recordset: linhas, rowsAffected: [1] };
    }
    if (s.startsWith('SELECT COUNT(*) AS total FROM notificacoes')) {
      const total = t.notificacoes.filter((n) => n.usuario_id === p[0] && !n.lida).length;
      return { recordset: [{ total }], rowsAffected: [1] };
    }
    if (s.startsWith('SELECT id, tipo, titulo')) {
      const linhas = t.notificacoes
        .filter((n) => n.usuario_id === p[0])
        .sort((a, b) => b.id - a.id)
        .map((n) => ({ id: n.id, tipo: n.tipo, titulo: n.titulo, mensagem: n.mensagem, lida: n.lida, criadoEm: n.criado_em }));
      return { recordset: linhas, rowsAffected: [1] };
    }
    if (s.startsWith('UPDATE notificacoes SET lida')) {
      let n = 0;
      for (const x of t.notificacoes) if (x.usuario_id === p[0] && !x.lida) { x.lida = 1; n++; }
      return { recordset: [], rowsAffected: [n] };
    }
    if (s.startsWith('SELECT id, tipo, descricao')) {
      const linhas = t.historico
        .filter((h) => h.usuario_id === p[0])
        .sort((a, b) => b.id - a.id)
        .map((h) => ({ id: h.id, tipo: h.tipo, descricao: h.descricao, criadoEm: h.criado_em }));
      return { recordset: linhas, rowsAffected: [1] };
    }
    throw new Error(`SQL não previsto no banco falso: ${s.slice(0, 80)}`);
  }

  // Espelha a API do mssql usada por db.executar.
  function request() {
    const valores = {};
    return {
      input(nome, valor) {
        valores[nome] = valor;
        return this;
      },
      async query(sql) {
        const p = [];
        for (const [nome, valor] of Object.entries(valores)) {
          const m = /^p(\d+)$/.exec(nome);
          if (m) p[+m[1]] = valor;
        }
        return rodar(sql, p);
      },
    };
  }

  const pool = {
    request,
    // db.transacao usa este hook quando presente (o sql.Transaction real não aceita pools falsos).
    async transacao(fn) {
      const snapshot = structuredClone(t);
      const seqAntes = seq;
      try {
        return await fn(pool);
      } catch (erro) {
        for (const k of Object.keys(t)) delete t[k];
        Object.assign(t, snapshot);
        seq = seqAntes;
        throw erro;
      }
    },
  };

  return { pool, tabelas: t };
}
