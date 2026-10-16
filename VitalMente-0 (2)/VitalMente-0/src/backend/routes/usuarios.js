import { Router } from 'express';
import { transacao, executar } from '../db.js';
import { ErroHttp, exigirLogin } from '../middleware.js';
import { hashSenha, hashToken, lerCookies, verificarSenha } from '../seguranca.js';
import { config } from '../config.js';
import { notificar, registrarHistorico, usuarioPublico } from '../servicos.js';
import { validarPerfil, validarSenhaNova } from '../validacao.js';

const PAPEIS_PERMITIDOS = ['admin', 'coordenador', 'professor', 'aluno', 'responsavel'];

export function rotasUsuarios(pool) {
  const r = Router();
  r.use(exigirLogin);

  r.patch('/me', async (req, res) => {
    const dados = validarPerfil(req.body);
    const papel = req.body.papel;
    try {
      await transacao(pool, async (conn) => {
        if (papel && PAPEIS_PERMITIDOS.includes(papel)) {
          await executar(conn, 'UPDATE usuarios SET papel = @p0 WHERE id = @p1', [papel, req.usuario.id]);
          await registrarHistorico(conn, req.usuario.id, 'papel', `Papel alterado para ${papel}`);
        }
        await executar(conn, 'UPDATE usuarios SET nome = @p0, email = @p1, telefone = @p2 WHERE id = @p3', [
          dados.nome,
          dados.email,
          dados.telefone,
          req.usuario.id,
        ]);
        await registrarHistorico(conn, req.usuario.id, 'perfil', 'Você atualizou os dados da sua conta');
      });
    } catch (erro) {
      // mssql: erro de chave duplicada vem como number=2627 (code='EREQUEST').
      if (erro?.number === 2627 || erro?.code === 2627 || /violation of unique key|cannot insert duplicate/i.test(String(erro?.message || '')))
        throw new ErroHttp(409, 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' });
      throw erro;
    }
    res.json({ usuario: usuarioPublico({ ...req.usuario, ...dados, papel: papel || req.usuario.papel, tipo_assinatura: req.usuario.tipo_assinatura }) });
  });

  r.put('/me/senha', async (req, res) => {
    const { senhaAtual, novaSenha } = validarSenhaNova(req.body);
    const [linhas] = await executar(pool, 'SELECT senha_hash FROM usuarios WHERE id = @p0', [req.usuario.id]);
    if (!linhas[0] || !(await verificarSenha(senhaAtual, linhas[0].senha_hash)))
      throw new ErroHttp(400, 'A senha atual está incorreta.', { senhaAtual: 'A senha atual está incorreta.' });
    const novoHash = await hashSenha(novaSenha);
    const tokenAtual = hashToken(lerCookies(req.headers.cookie)[config.sessao.cookie] || '');
    await transacao(pool, async (conn) => {
      await executar(conn, 'UPDATE usuarios SET senha_hash = @p0 WHERE id = @p1', [novoHash, req.usuario.id]);
      // Encerra as outras sessões; só a atual continua válida.
      await executar(conn, 'DELETE FROM sessoes WHERE usuario_id = @p0 AND token_hash <> @p1', [req.usuario.id, tokenAtual]);
      await registrarHistorico(conn, req.usuario.id, 'senha', 'Você alterou sua senha');
      await notificar(conn, req.usuario.id, 'seguranca', 'Senha alterada', 'A senha da sua conta foi alterada. Se não foi você, entre em contato com o suporte.');
    });
    res.json({ ok: true });
  });

  return r;
}
