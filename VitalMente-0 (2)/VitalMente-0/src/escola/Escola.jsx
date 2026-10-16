import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../compartilhado/api.js';
import './escola.css';

const ENTIDADES = [
  { chave: 'turmas', label: 'Turmas', icon: '' },
  { chave: 'disciplinas', label: 'Disciplinas', icon: '' },
  { chave: 'professores', label: 'Professores', icon: '' },
  { chave: 'alunos', label: 'Alunos', icon: '' },
  { chave: 'matriculas', label: 'Matrículas', icon: '' },
  { chave: 'avaliacoes', label: 'Avaliações', icon: '' },
  { chave: 'frequencia', label: 'Frequência', icon: '' },
  { chave: 'eventos', label: 'Eventos', icon: '' },
];

export default function Escola() {
  const navigate = useNavigate();
  const [aba, setAba] = useState('turmas');
  const [dados, setDados] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({});
  const [abrindoForm, setAbrindoForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    carregarEntidade(aba);
  }, [aba]);

  async function carregarEntidade(chave) {
    setCarregando(true);
    try {
      const resposta = await api(`/escola/${chave}`);
      setDados((prev) => ({ ...prev, [chave]: resposta.itens || resposta }));
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e.message || 'Erro ao carregar.' });
    } finally {
      setCarregando(false);
    }
  }

  async function salvar() {
    try {
      if (editando) {
        await api(`/escola/${aba}/${editando}`, { metodo: 'PUT', corpo: form });
        setMensagem({ tipo: 'ok', texto: 'Atualizado com sucesso.' });
      } else {
        await api(`/escola/${aba}`, { metodo: 'POST', corpo: form });
        setMensagem({ tipo: 'ok', texto: 'Cadastrado com sucesso.' });
      }
      setForm({});
      setEditando(null);
      setAbrindoForm(false);
      carregarEntidade(aba);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e.message || 'Erro ao salvar.' });
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este registro?')) return;
    try {
      await api(`/escola/${aba}/${id}`, { metodo: 'DELETE' });
      setMensagem({ tipo: 'ok', texto: 'ExcluÃ­do com sucesso.' });
      carregarEntidade(aba);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e.message || 'Erro ao excluir.' });
    }
  }

  function editar(item) {
    setForm({ ...item });
    setEditando(item.id);
    setAbrindoForm(true);
  }

  function novo() {
    setForm({});
    setEditando(null);
    setAbrindoForm(true);
  }

  function camposDaEntidade() {
    switch (aba) {
      case 'turmas':
        return [
          { chave: 'nome', label: 'Nome da turma', tipo: 'text', placeholder: 'Ex: 3º A' },
          { chave: 'ano', label: 'Ano', tipo: 'number', placeholder: '2026' },
          { chave: 'semestre', label: 'Semestre', tipo: 'number', placeholder: '1' },
          { chave: 'turno', label: 'Turno', tipo: 'select', opcoes: ['Manhã', 'Tarde', 'Noite', 'Integral'] },
          { chave: 'sala', label: 'Sala', tipo: 'text', placeholder: '101' },
        ];
      case 'disciplinas':
        return [
          { chave: 'nome', label: 'Nome da disciplina', tipo: 'text', placeholder: 'Ex: Matemática' },
          { chave: 'codigo', label: 'Código', tipo: 'text', placeholder: 'Ex: MAT101' },
          { chave: 'carga_horaria', label: 'Carga horária', tipo: 'number', placeholder: '80' },
        ];
      case 'professores':
        return [
          { chave: 'nome', label: 'Nome', tipo: 'text', placeholder: 'Ex: Carlos Almeida' },
          { chave: 'email', label: 'E-mail', tipo: 'email', placeholder: 'carlos@escola.edu.br' },
          { chave: 'matricula', label: 'Matrícula', tipo: 'text', placeholder: 'PROF001' },
          { chave: 'telefone', label: 'Telefone', tipo: 'text', placeholder: '(11) 90000-0000' },
          { chave: 'disciplina_id', label: 'Disciplina', tipo: 'number', placeholder: 'ID da disciplina' },
          { chave: 'status', label: 'Status', tipo: 'select', opcoes: ['Ativo', 'Afastado', 'Demitido'] },
        ];
      case 'alunos':
        return [
          { chave: 'nome', label: 'Nome', tipo: 'text', placeholder: 'Ex: Ana Souza' },
          { chave: 'email', label: 'E-mail', tipo: 'email', placeholder: 'ana@email.com' },
          { chave: 'matricula', label: 'Matrícula', tipo: 'text', placeholder: 'ALU001' },
          { chave: 'data_nascimento', label: 'Data nascimento', tipo: 'date' },
          { chave: 'telefone', label: 'Telefone', tipo: 'text', placeholder: '(11) 90000-0000' },
          { chave: 'turma_id', label: 'Turma', tipo: 'number', placeholder: 'ID da turma' },
          { chave: 'responsavel_nome', label: 'Responsável', tipo: 'text', placeholder: 'Nome do responsável' },
          { chave: 'responsavel_telefone', label: 'Tel. responsável', tipo: 'text', placeholder: '(11) 90000-0000' },
          { chave: 'status', label: 'Status', tipo: 'select', opcoes: ['Ativo', 'Trancado', 'Transferido', 'Concluido'] },
        ];
      case 'matriculas':
        return [
          { chave: 'aluno_id', label: 'Aluno (ID)', tipo: 'number', placeholder: 'ID do aluno' },
          { chave: 'turma_id', label: 'Turma (ID)', tipo: 'number', placeholder: 'ID da turma' },
          { chave: 'disciplina_id', label: 'Disciplina (ID)', tipo: 'number', placeholder: 'ID da disciplina' },
          { chave: 'ano', label: 'Ano', tipo: 'number', placeholder: '2026' },
          { chave: 'semestre', label: 'Semestre', tipo: 'number', placeholder: '1' },
        ];
      case 'avaliacoes':
        return [
          { chave: 'aluno_id', label: 'Aluno (ID)', tipo: 'number', placeholder: 'ID do aluno' },
          { chave: 'disciplina_id', label: 'Disciplina (ID)', tipo: 'number', placeholder: 'ID da disciplina' },
          { chave: 'tipo', label: 'Tipo', tipo: 'select', opcoes: ['Prova', 'Trabalho', 'Seminario', 'Lista', 'Participacao', 'Recuperacao'] },
          { chave: 'nota', label: 'Nota', tipo: 'number', placeholder: '0 a 10' },
          { chave: 'nota_max', label: 'Nota máxima', tipo: 'number', placeholder: '10' },
          { chave: 'data_avaliacao', label: 'Data', tipo: 'date' },
          { chave: 'observacoes', label: 'Observações', tipo: 'text', placeholder: 'Observações' },
        ];
      case 'frequencia':
        return [
          { chave: 'aluno_id', label: 'Aluno (ID)', tipo: 'number', placeholder: 'ID do aluno' },
          { chave: 'disciplina_id', label: 'Disciplina (ID)', tipo: 'number', placeholder: 'ID da disciplina' },
          { chave: 'data_aula', label: 'Data da aula', tipo: 'date' },
          { chave: 'presente', label: 'Presente', tipo: 'select', opcoes: ['1', '0'] },
          { chave: 'justificativa', label: 'Justificativa', tipo: 'text', placeholder: 'Justificativa' },
        ];
      case 'eventos':
        return [
          { chave: 'titulo', label: 'Título', tipo: 'text', placeholder: 'Ex: Reunião de Pais' },
          { chave: 'descricao', label: 'Descrição', tipo: 'text', placeholder: 'Descrição do evento' },
          { chave: 'data_evento', label: 'Data/hora', tipo: 'datetime-local' },
          { chave: 'local_evento', label: 'Local', tipo: 'text', placeholder: 'Auditório' },
          { chave: 'tipo', label: 'Tipo', tipo: 'select', opcoes: ['Aula', 'Prova', 'Reuniao', 'Evento', 'Feriado', 'Outro'] },
          { chave: 'responsavel_id', label: 'Responsável (ID)', tipo: 'number', placeholder: 'ID do professor' },
        ];
      default:
        return [];
    }
  }
ï¿½ï¿½

  function colunasDaEntidade() {
    switch (aba) {
      case 'turmas': return ['nome', 'ano', 'semestre', 'turno', 'sala'];
      case 'disciplinas': return ['nome', 'codigo', 'carga_horaria'];
      case 'professores': return ['nome', 'email', 'matricula', 'disciplina_nome', 'status'];
      case 'alunos': return ['nome', 'matricula', 'turma_nome', 'status'];
      case 'matriculas': return ['aluno_nome', 'turma_nome', 'disciplina_nome', 'ano', 'semestre'];
      case 'avaliacoes': return ['aluno_nome', 'disciplina_nome', 'tipo', 'nota', 'nota_max', 'data_avaliacao'];
      case 'frequencia': return ['aluno_nome', 'disciplina_nome', 'data_aula', 'presente'];
      case 'eventos': return ['titulo', 'data_evento', 'tipo', 'responsavel_nome'];
      default: return [];
    }
  }

  const itens = dados[aba] || [];
  const campos = camposDaEntidade();
  const colunas = colunasDaEntidade();

  return (
    <div className="escola-page">
      <header className="escola-header">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate('/home')}
          aria-label="Voltar"
        >
          ←
        </button>
        <div>
          <span className="escola-eyebrow">MÓDULO ESCOLAR</span>
          <h1>Gestão Escolar</h1>
          <p>Cadastre turmas, disciplinas, professores, alunos e muito mais.</p>
        </div>
      </header>

      <main className="escola-content">
        <section className="escola-tabs">
          {ENTIDADES.map((e) => (
            <button
              key={e.chave}
              className={`escola-tab ${aba === e.chave ? 'ativo' : ''}`}
              onClick={() => setAba(e.chave)}
            >
              {e.icon} {e.label}
            </button>
          ))}
        </section>

        {mensagem.texto && (
          <p
            className={`escola-mensagem ${mensagem.tipo}`}
            role="status"
          >
            {mensagem.texto}
          </p>
        )}

        <section className="escola-card">
          <div className="escola-card-head">
            <h2>{ENTIDADES.find((e) => e.chave === aba)?.label}</h2>
            <button
              type="button"
              className="nova-button"
              onClick={novo}
            >
              + Novo
            </button>
          </div>
          {carregando ? (
            <p className="escola-vazio">Carregando...</p>
          ) : itens.length === 0 ? (
            <p className="escola-vazio">Nenhum registro encontrado.</p>
          ) : (
            <ul className="escola-lista">
              {itens.map((item) => (
                <li key={item.id} className="escola-item">
                  <div className="escola-item-dados">
                    {colunas.map((c) => (
                      <span key={c} className="escola-item-valor">
                        {item[c] !== null && item[c] !== undefined ? item[c] : '—'}
                      </span>
                    ))}
                  </div>
                  <div className="escola-item-acoes">
                    <button
                      type="button"
                      className="editar-button"
                      onClick={() => editar(item)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="excluir-button"
                      onClick={() => excluir(item.id)}
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {abrindoForm && (
          <div className="escola-overlay" onMouseDown={() => setAbrindoForm(false)}>
            <div className="escola-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="escola-modal-header">
                <button
                  type="button"
                  className="fechar-button"
                  onClick={() => setAbrindoForm(false)}
                  aria-label="Fechar"
                >
                  ×
                </button>
                <h3>{editando ? 'Editar' : 'Novo'} {ENTIDADES.find((e) => e.chave === aba)?.label}</h3>
              </div>

              <form className="escola-form" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
                {campos.map((c) => (
                  <div key={c.chave} className="escola-form-group">
                    <label htmlFor={`cad-${c.chave}`}>{c.label}</label>
                    {c.opcoes ? (
                      <select
                        id={`cad-${c.chave}`}
                        value={form[c.chave] || ''}
                        onChange={(ev) => setForm({ ...form, [c.chave]: ev.target.value })}
                      >
                        <option value="">Selecione</option>
                        {c.opcoes.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`cad-${c.chave}`}
                        type={c.tipo}
                        value={form[c.chave] || ''}
                        onChange={(ev) => setForm({ ...form, [c.chave]: ev.target.value })}
                        placeholder={c.placeholder}
                      />
                    )}
                  </div>
                ))}
                <div className="escola-form-botoes">
                  <button
                    type="button"
                    className="cancelar-button"
                    onClick={() => setAbrindoForm(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="salvar-button">
                    {editando ? 'Salvar alterações' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="escola-footer">
        <strong>VitalMente</strong>
        <span>•</span>
        <span>Sua saúde começa pela sua mente.</span>
      </footer>
    </div>
  );
}


