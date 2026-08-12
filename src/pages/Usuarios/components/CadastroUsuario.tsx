// Arquivo: src/pages/Usuarios/components/CadastroUsuario.tsx
import { useState, useEffect } from 'react';
import { LISTA_MODULOS_SISTEMA, permissoesService } from '../../Permissoes/services/permissoesService';

interface CadastroUsuarioProps {
  usuarioEdicao?: any;
  perfis?: any[];
  onSalvar?: (dados: any) => Promise<void>;
  onSucesso?: () => void; // 👈 Adicionado para resolver o erro do TypeScript
  onCancelar: () => void;
}

export default function CadastroUsuario({
  usuarioEdicao,
  perfis = [],
  onSalvar,
  onSucesso,
  onCancelar
}: CadastroUsuarioProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [setor, setSetor] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (usuarioEdicao) {
      setNome(usuarioEdicao.nome || '');
      setEmail(usuarioEdicao.email || '');
      setSetor(usuarioEdicao.setor || '');
      setPerfilId(usuarioEdicao.perfil_id || (perfis[0]?.id || ''));
      
      // Carrega permissões atuais do usuário se estiver editando
      permissoesService.buscarPermissoesUsuario(usuarioEdicao.id).then((m) => setModulosPermitidos(m));
    } else if (perfis.length > 0) {
      setPerfilId(perfis[0].id);
    }
  }, [usuarioEdicao, perfis]);

  const handleToggleModulo = (mod: string) => {
    setModulosPermitidos((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvando(true);
      const payload: any = {
        nome: nome.trim(),
        email: email.trim(),
        setor: setor.trim(),
        perfil_id: perfilId
      };

      if (!usuarioEdicao) {
        payload.senha_hash = senha;
      }

      if (onSalvar) {
        await onSalvar(payload);
      }

      // Se estiver criando ou editando, salva os módulos vinculados ao usuário
      if (usuarioEdicao?.id) {
        await permissoesService.salvarPermissoesUsuario(usuarioEdicao.id, modulosPermitidos);
      }

      if (onSucesso) {
        onSucesso();
      } else {
        onCancelar();
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados do usuário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
          <h3 className="text-[#09797a] font-black text-base uppercase">
            {usuarioEdicao ? 'EDITAR USUÁRIO' : 'NOVO USUÁRIO'}
          </h3>
          <button type="button" onClick={onCancelar} className="text-gray-400 font-bold text-base">✕</button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-3 pr-1 flex-1">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Nome Completo</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">
                {usuarioEdicao ? 'Nova Senha (Opcional)' : 'Senha'}
              </label>
              <input
                type="password"
                required={!usuarioEdicao}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Setor</label>
              <input
                type="text"
                required
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>

            {perfis.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Perfil do Usuário</label>
                <select
                  value={perfilId}
                  onChange={(e) => setPerfilId(e.target.value)}
                  className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                >
                  {perfis.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* PERMISSÕES INDIVIDUAIS DE MÓDULO */}
          <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase px-1">Permissões de Acesso aos Módulos</span>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-gray-50 rounded-2xl border border-gray-200">
              {LISTA_MODULOS_SISTEMA.map((mod) => {
                const marcado = modulosPermitidos.includes(mod);
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => handleToggleModulo(mod)}
                    className={`p-2 rounded-xl border text-left text-[11px] font-bold flex justify-between items-center ${
                      marcado ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    <span>{mod}</span>
                    <span>{marcado ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            {salvando ? 'Salvando...' : 'Salvar Usuário'}
          </button>
        </div>
      </form>
    </div>
  );
}