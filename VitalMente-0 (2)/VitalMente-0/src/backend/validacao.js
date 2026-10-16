// Validação e normalização das entradas (sempre no servidor).
export class ErroValidacao extends Error {
  constructor(mensagem, campos = {}) {
    super(mensagem);
    this.status = 400;
    this.campos = campos;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME = /^[a-z0-9_]{3,30}$/;

export const SENTIMENTOS = ['Bem', 'Tranquilo', 'Ansioso', 'Cansado', 'Motivado'];
export const CATEGORIAS = ['Saúde mental', 'Exercícios', 'Nutrição', 'Sono', 'Bem-estar'];
export const PAPEIS_ESCOLARES = ['admin', 'coordenador', 'professor', 'aluno', 'responsavel'];

export function validarPapel(papel) {
  if (!papel || !PAPEIS_ESCOLARES.includes(papel))
    throw new ErroValidacao('Papel invalido. Use: admin, coordenador, professor, aluno ou responsavel.');
  return papel;
}
export const OPCOES_ASSUNTO = [
  'O conteúdo associado não é relevante',
  'Este assunto é spam',
  'Este assunto é abusivo ou nocivo',
  'Não me interessa',
  'Este assunto é uma duplicação',
  'Este assunto é prejudicial ou spam',
  'Não quero ver este anúncio',
];

const texto = (v) => (typeof v === 'string' ? v.normalize('NFC').trim() : '');

export function validarRegistro(corpo = {}) {
  const nome = texto(corpo.nome);
  const username = texto(corpo.username).replace(/^@/, '').toLowerCase();
  const email = texto(corpo.email).toLowerCase();
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  const erros = {};
  if (nome.length < 2 || nome.length > 100) erros.nome = 'Informe seu nome (2 a 100 caracteres).';
  if (!USERNAME.test(username))
    erros.username = 'Usuário: 3 a 30 caracteres, só letras minúsculas, números e _.';
  if (email.length > 160 || !EMAIL.test(email)) erros.email = 'Informe um e-mail válido.';
  Object.assign(erros, erroSenha(senha, 'senha'));
  if (Object.keys(erros).length) throw new ErroValidacao(Object.values(erros)[0], erros);
  return { nome, username, email, senha };
}

export function erroSenha(senha, campo) {
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128)
    return { [campo]: 'A senha deve ter de 8 a 128 caracteres.' };
  return {};
}

export function validarLogin(corpo = {}) {
  const identificador = texto(corpo.identificador).replace(/^@/, '').toLowerCase();
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (!identificador || identificador.length > 160 || !senha || senha.length > 128)
    throw new ErroValidacao('Informe e-mail/usuário e senha.');
  return { identificador, senha };
}

export function validarPerfil(corpo = {}) {
  const nome = texto(corpo.nome);
  const email = texto(corpo.email).toLowerCase();
  const telefone = texto(corpo.telefone);
  const erros = {};
  if (nome.length < 2 || nome.length > 100) erros.nome = 'Informe seu nome (2 a 100 caracteres).';
  if (email.length > 160 || !EMAIL.test(email)) erros.email = 'Informe um e-mail válido.';
  if (telefone && !/^[0-9+()\-\s]{8,20}$/.test(telefone)) erros.telefone = 'Telefone inválido.';
  if (Object.keys(erros).length) throw new ErroValidacao(Object.values(erros)[0], erros);
  return { nome, email, telefone: telefone || null };
}

export function validarSenhaNova(corpo = {}) {
  const senhaAtual = typeof corpo.senhaAtual === 'string' ? corpo.senhaAtual : '';
  const novaSenha = typeof corpo.novaSenha === 'string' ? corpo.novaSenha : '';
  if (!senhaAtual) throw new ErroValidacao('Informe a senha atual.');
  const erros = erroSenha(novaSenha, 'novaSenha');
  if (Object.keys(erros).length) throw new ErroValidacao(erros.novaSenha, erros);
  return { senhaAtual, novaSenha };
}

export function validarPublicacao(corpo = {}) {
  const textoPub = texto(corpo.texto);
  const sentimento = texto(corpo.sentimento) || null;
  const categoria = texto(corpo.categoria) || null;
  if (!textoPub) throw new ErroValidacao('Escreva algo para publicar.');
  if ([...textoPub].length > 280) throw new ErroValidacao('A publicação pode ter no máximo 280 caracteres.');
  if (sentimento && !SENTIMENTOS.includes(sentimento)) throw new ErroValidacao('Sentimento inválido.');
  if (categoria && !CATEGORIAS.includes(categoria)) throw new ErroValidacao('Categoria inválida.');
  return { texto: textoPub, sentimento, categoria };
}

export function validarFeedbackAssunto(corpo = {}) {
  const assunto = texto(corpo.assunto);
  const opcao = texto(corpo.opcao);
  if (!assunto || assunto.length > 120) throw new ErroValidacao('Assunto inválido.');
  if (!OPCOES_ASSUNTO.includes(opcao)) throw new ErroValidacao('Opção inválida.');
  return { assunto, opcao };
}

export function validarCliente(corpo = {}) {
  const nome = texto(corpo.nome);
  const email = texto(corpo.email).toLowerCase();
  if (!nome || nome.length > 120) throw new ErroValidacao('Informe o nome (até 120 caracteres).');
  if (email.length > 160 || !EMAIL.test(email)) throw new ErroValidacao('Informe um e-mail válido.');
  return { nome, email };
}

export function inteiroPositivo(valor, padrao, max = 100) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isFinite(n) || n < 1) return padrao;
  return Math.min(n, max);
}

// Escapa curingas do LIKE para a busca não virar um padrão controlado pelo usuário.
export function escaparLike(s) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
