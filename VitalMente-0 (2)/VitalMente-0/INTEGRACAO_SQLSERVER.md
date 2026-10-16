# VitalMente — integração com SQL Server (Projeto Escolar)

## Arquitetura
Navegador (React/Vite) ? `/api` ? Express (`src/backend`) ? SQL Server. O navegador nunca fala com o banco.

- `src/backend/config.js` variáveis de ambiente · `db.js` pool único + transações + helper `executar()` (converte `?` em `@pN`)
- `seguranca.js` hash scrypt, tokens de sessão · `validacao.js` validação/normalização
- `middleware.js` CSRF, rate limit, sessão, tratamento de erros · `exigirPapel` (controle de acesso escolar)
- `routes/*` endpoints (auth, usuarios, publicacoes, notificacoes, historico, assuntos, clientes, escola)
- `migrations/001_estrutura_inicial.sql` + `migrar.js` criação reproduzível (guards `IF NOT EXISTS`; o driver executa cada batch `GO` separadamente)
- `src/backend/seed.js` popula dados de exemplo da escola (idempotente via `IF NOT EXISTS`)
- `src/compartilhado/` cliente da API, hooks e lista de dados do frontend

## Tabelas
### Core (rede social de bem-estar)
usuarios, sessoes (FK usuarios), publicacoes (FK usuarios), notificacoes (FK), historico (FK),
assuntos, assuntos_feedback (FK), clientes. `NVARCHAR` / collation `Latin1_General_100_CI_AS_KS_WS_SC_UTF8`.

### Módulo escolar (gestão acadêmica)
turmas, disciplinas, professores, alunos, matriculas, avaliacoes, frequencia, eventos_escolares.

## Papéis de usuário (coluna `papel` em `usuarios`)
- `admin` — acesso total ao sistema
- `coordenador` — gestão escolar (turmas, disciplinas, professores, alunos, matrículas)
- `professor` — lançar avaliações, frequência, eventos
- `aluno` — visualizar own dados, frequência, notas
- `responsavel` — acompanhar aluno vinculado

## Instalação (desenvolvimento)
```bash
# 1. Instale dependências
npm install

# 2. Configure o banco (copie e edite o .env)
cp src/backend/.env.example src/backend/.env
# preencha DB_USER e DB_PASSWORD conforme seu SQL Server local
# em SQL Server local/desktop defina DB_TRUST_SERVER_CERT=true
# em Azure SQL defina DB_ENCRYPT=true

# 3. Crie o banco e as tabelas
npm run db:migrate

# 4. (Opcional) Popule com dados de exemplo da escola
npm run db:seed
# Senha padrão de todos os usuários do seed: 12345678

# 5. Inicie a API (terminal 1)
npm run server          # porta 3000

# 6. Inicie o front-end (terminal 2)
npm run dev             # porta 5173

# 7. Execute os testes (não precisam de SQL Server)
npm test                # --test-timeout=120s: o import do mssql e lento em disco frio
```

## Rotas da API (`/api`)
- `POST /api/auth/registro` — cadastro
- `POST /api/auth/login` — login (cookie de sessão httpOnly)
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — dados da sessão atual
- `PATCH /api/usuarios/me` — editar perfil (inclui papel se admin/coordenador)
- `PUT /api/usuarios/me/senha` — alterar senha
- `GET/POST/PUT/DELETE /api/escola/{entidade}` — turmas, disciplinas, professores, alunos, matriculas, avaliacoes, frequencia, eventos
- `GET /api/notificacoes`, `GET /api/historico`, `GET/POST /api/assuntos`, `GET/POST /api/clientes`

### Controle de acesso nas rotas escolares
- `GET` (listar): qualquer usuário logado
- `POST/PUT/DELETE` (turmas, disciplinas, professores, alunos, matriculas): apenas `admin` e `coordenador`
- `POST` (avaliacoes, frequencia, eventos): `admin`, `coordenador` e `professor`
- `DELETE` (avaliacoes, frequencia, eventos): apenas `admin` e `coordenador`

## Produção
1. Crie o banco em um SQL Server gerenciado (Azure SQL, VPS etc.); crie um usuário só com permissões nesse banco; libere a porta 1433 apenas para o IP do servidor da aplicação.
2. Defina as variáveis do `.env` no painel da hospedagem (`NODE_ENV=production`, `DB_*`, `DB_ENCRYPT=true` no Azure SQL, `CORS_ORIGIN`, `TRUST_PROXY=true` atrás de proxy).
3. `npm run build`, `npm run db:migrate`, `SERVE_FRONTEND=true npm run server` (um servidor só, HTTPS obrigatório).
   Se site e API ficarem em domínios diferentes: `VITE_API_URL` no build do front, `COOKIE_SAMESITE=none` e `CORS_ORIGIN` com o domínio do site.

## Segurança implementada
Parâmetros nomeados (`@pN`) em todas as consultas · senhas com scrypt + salt · sessão em cookie httpOnly (só o hash do token vai ao banco) ·
CSRF (cabeçalho customizado + checagem de Origin) · CORS restrito · rate limit em login/cadastro/publicação ·
validação no servidor · dono verificado ao excluir · erros sem detalhes internos · login sem revelar se o usuário existe ·
controle de acesso por papel (exigirPapel) nas rotas escolares.
