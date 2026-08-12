// Arquivo: src/pages/Permissoes/index.tsx
import { useState, useEffect } from 'react';
import { permissoesService, LISTA_MODULOS_SISTEMA } from './services/permissoesService';

interface PermissoesProps {
  onVoltarParaHome: () => void;
}

export default function Permissoes({ onVoltarParaHome }: PermissoesProps) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState<string>('');
  const [modulosAtivos, setModulosAtivos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const lista = await permissoesService.listarUsuarios();
      setUsuarios(lista);
      if (lista.length > 0) {
        setUsuarioSelecionadoId(lista[0].id);
        carregarPermissoesDoUsuario(lista[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const carregarPermissoesDoUsuario = async (uId: string) => {
    try {
      setLoading(true);
      const liberados = await permissoesService.buscarPermissoesUsuario(uId);
      setModulosAtivos(liberados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrocarUsuario = (uId: string) => {
    setUsuarioSelecionadoId(uId);
    carregarPermissoesDoUsuario(uId);
  };

  const handleToggleModulo = (modulo: string) => {
    setModulosAtivos((prev) =>
      prev.includes(modulo) ? prev.filter((m) => m !== modulo) : [...prev, modulo]
    );
  };

  const handleSalvar = async () => {
    if (!usuarioSelecionadoId) return;
    try {
      setSalvando(true);
      await permissoesService.salvarPermissoesUsuario(usuarioSelecionadoId, modulosAtivos);
      alert('Permissões do usuário atualizadas com sucesso!');
    } catch (err) {
      alert('Erro ao salvar permissões do usuário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">PERMISSÕES POR USUÁRIO</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Controle de acesso individual aos módulos</p>
            </div>
          </div>
        </div>

        {/* SELEÇÃO DO USUÁRIO */}
        <div className="flex flex-col gap-1 bg-gray-50 p-3.5 border border-gray-200 rounded-2xl">
          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Selecione o Usuário</label>
          <select
            value={usuarioSelecionadoId}
            onChange={(e) => handleTrocarUsuario(e.target.value)}
            className="w-full h-11 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase focus:outline-none focus:border-[#09797a]"
          >
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome.toUpperCase()} ({u.setor || 'Sem setor'})
              </option>
            ))}
          </select>
        </div>

        {/* GRID DE MÓDULOS */}
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">Módulos Liberados no Sistema</span>

          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Buscando permissões...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[50vh] pr-1">
              {LISTA_MODULOS_SISTEMA.map((modulo: string) => {
                const ativo = modulosAtivos.includes(modulo);
                return (
                  <button
                    key={modulo}
                    type="button"
                    onClick={() => handleToggleModulo(modulo)}
                    className={`p-3 rounded-2xl border text-left flex justify-between items-center transition-all ${
                      ativo
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    <span className="text-xs font-black uppercase">{modulo}</span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      ativo ? 'bg-[#09797a] text-white' : 'bg-gray-200 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTÃO SALVAR */}
        <button
          type="button"
          disabled={salvando || !usuarioSelecionadoId}
          onClick={handleSalvar}
          className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-3.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
        >
          {salvando ? 'Salvando Permissões...' : 'Salvar Permissões do Usuário'}
        </button>

      </div>
    </div>
  );
}