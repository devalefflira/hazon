import { useState, useEffect } from 'react';
import { categoriasService } from '../services/categoriasService';

interface UnidadeMedida {
  id: string;
  sigla: string;
  descricao: string;
}

export default function UnidadesMedida() {
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Estados do formulário de cadastro
  const [sigla, setSigla] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarUnidades = async () => {
    try {
      setLoading(true);
      const dados = await categoriasService.listarUnidadesMedida();
      setUnidades(dados as UnidadeMedida[] || []);
    } catch (err) {
      setErro('Erro ao buscar as unidades de medida do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUnidades();
  }, []);

  const handleCadastrarUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação sênior de tamanho de sigla (padrão de mercado para ERPs)
    if (sigla.trim().length < 2 || sigla.trim().length > 5) {
      setErro('A sigla deve conter entre 2 e 5 caracteres (Ex: UN, CX, FD).');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      
      // Enviamos a sigla forçada em caixa alta para o banco
      await categoriasService.salvarUnidadeMedida(sigla.trim().toUpperCase(), descricao.trim());
      
      // Limpa os campos após o sucesso
      setSigla('');
      setDescricao('');
      
      // Atualiza a listagem em tempo real
      await carregarUnidades();
    } catch (err: any) {
      setErro(err.message?.includes('duplicate') ? 'Esta sigla de unidade já está cadastrada.' : 'Erro ao salvar a unidade de medida.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]"></div>
        <span className="text-sm text-gray-500 mt-3 font-medium">Buscando do banco...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* MENSAGENS DE FEEDBACK/ERRO */}
      {erro && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 font-medium text-center">
          {erro}
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO RÁPIDO */}
      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 mb-6 flex flex-col gap-3">
        <form onSubmit={handleCadastrarUnidade} className="w-full flex flex-col gap-2">
          <div className="w-full flex gap-2">
            {/* Input da Sigla com transformação automática para uppercase */}
            <input
              type="text"
              placeholder="Sigla (Ex: UN)"
              value={sigla}
              onChange={(e) => setSigla(e.target.value.toUpperCase())} // Força Caixa Alta no Input
              disabled={salvando}
              className="w-[35%] bg-white border border-gray-300 rounded-xl px-3 h-10 text-sm outline-none focus:border-[#09797a] uppercase font-bold tracking-wider"
              required
            />
            <input
              type="text"
              placeholder="Descrição (Ex: Unidade)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={salvando}
              className="flex-1 bg-white border border-gray-300 rounded-xl px-3 h-10 text-sm outline-none focus:border-[#09797a]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-[#09797a] text-white font-bold rounded-xl text-xs h-10 active:scale-[0.98] transition-all disabled:bg-gray-300"
          >
            {salvando ? 'Salvando...' : '+ Cadastrar Unidade de Medida'}
          </button>
        </form>
      </div>

      {/* LISTAGEM LINEAR DAS UNIDADES */}
      <div className="w-full flex flex-col gap-2 overflow-y-auto max-h-87.5 pr-1 border border-gray-100 rounded-2xl p-3 bg-white shadow-inner">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider select-none border-b border-gray-100 pb-1 mb-1">
          Unidades Disponíveis
        </h3>

        {unidades.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhuma unidade de medida cadastrada.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {unidades.map((unidade) => (
              <div 
                key={unidade.id} 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between"
              >
                {/* Sigla Destacada em estilo Tag */}
                <div className="flex items-center gap-3">
                  <span className="bg-[#09797a] text-white text-xs font-black px-2.5 py-1 rounded-lg min-w-11.25 text-center tracking-wider shadow-sm">
                    {unidade.sigla}
                  </span>
                  <span className="text-sm text-gray-800 font-bold">
                    {unidade.descricao}
                  </span>
                </div>
                
                {/* Indicador visual discreto de check do sistema */}
                <span className="text-emerald-600 text-xs font-bold">✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}