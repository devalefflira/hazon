// Arquivo: src/pages/Usuarios/index.tsx
import { useState, useEffect } from 'react';
import { usuariosService } from './services/usuariosService';
import CadastroUsuario from './components/CadastroUsuario';

interface UsuariosProps {
  onVoltarParaHome: () => void;
}

export default function Usuarios({ onVoltarParaHome }: UsuariosProps) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [perfis, setPerfis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEdicao, setUsuarioEdicao] = useState<any | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [listaUsuarios, listaPerfis] = await Promise.all([
        usuariosService.listarUsuarios(),
        usuariosService.listarPerfis()
      ]);
      setUsuarios(listaUsuarios);
      setPerfis(listaPerfis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSalvarUsuario = async (payload: any) => {
    if (usuarioEdicao) {
      await usuariosService.atualizarUsuario(usuarioEdicao.id, payload);
      alert('Usuário atualizado com sucesso!');
    } else {
      await usuariosService.criarUsuario(payload);
      alert('Usuário cadastrado com sucesso!');
    }
    setModalAberto(false);
    setUsuarioEdicao(null);
    carregarDados();
  };

  const handleExcluir = async (user: any) => {
    if (user.email.toLowerCase() === 'aleff@hazon.com') {
      alert('O usuário administrador principal (Aleff) não pode ser excluído.');
      return;
    }

    if (confirm(`Deseja realmente excluir o usuário ${user.nome}?`)) {
      try {
        await usuariosService.excluirUsuario(user.id);
        alert('Usuário excluído com sucesso!');
        carregarDados();
      } catch (err) {
        alert('Erro ao excluir usuário.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-3xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">USUÁRIOS</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Gerenciamento de Contas do Sistema</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setUsuarioEdicao(null);
              setModalAberto(true);
            }}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Novo Usuário
          </button>
        </div>

        {/* LISTAGEM */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando usuários...</div>
          ) : usuarios.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-xs text-gray-800 uppercase">{u.nome}</h4>
                      <span className="text-[9px] font-bold text-[#e07a5f] bg-orange-50 px-2 py-0.5 rounded-md uppercase">
                        {u.perfis?.nome || 'Operador'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      E-mail: {u.email} | Setor: {u.setor}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUsuarioEdicao(u);
                        setModalAberto(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-black uppercase"
                    >
                      Editar
                    </button>
                    {u.email.toLowerCase() !== 'aleff@hazon.com' && (
                      <button
                        type="button"
                        onClick={() => handleExcluir(u)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-xl text-xs font-black uppercase"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {modalAberto && (
        <CadastroUsuario
          usuarioEdicao={usuarioEdicao}
          perfis={perfis}
          onSalvar={handleSalvarUsuario}
          onCancelar={() => {
            setModalAberto(false);
            setUsuarioEdicao(null);
          }}
        />
      )}
    </div>
  );
}