import { useState, useEffect } from 'react';
import { categoriasService } from '../services/categoriasService';

interface ItemSimples {
  id: string;
  descricao: string;
}

interface StatusValidade {
  id: string;
  nome: string;
  regra_dias_min: number | null;
  regra_dias_max: number | null;
}

type AbaAtiva = 'faltas' | 'avarias' | 'validade';

export default function MotivosStatus() {
  const [aba, setAba] = useState<AbaAtiva>('faltas');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Estados das listas do banco
  const [motivosFalta, setMotivosFalta] = useState<ItemSimples[]>([]);
  const [motivosAvaria, setMotivosAvaria] = useState<ItemSimples[]>([]);
  const [regrasValidade, setRegrasValidade] = useState<StatusValidade[]>([]);

  // Estado do formulário de entrada única
  const [novaDescricao, setNovaDescricao] = useState('');

  const carregarDadosDaAba = async () => {
    try {
      setLoading(true);
      setErro('');
      
      if (aba === 'faltas') {
        const dados = await categoriasService.listarMotivosFalta();
        setMotivosFalta(dados as ItemSimples[] || []);
      } else if (aba === 'avarias') {
        const dados = await categoriasService.listarMotivosAvaria();
        setMotivosAvaria(dados as ItemSimples[] || []);
      } else if (aba === 'validade') {
        const dados = await categoriasService.listarStatusValidade();
        setRegrasValidade(dados as unknown as StatusValidade[] || []);
      }
    } catch (err) {
      setErro('Erro ao carregar dados do catálogo.');
    } finally {
      setLoading(false);
    }
  };

  // Recarrega os dados sempre que o usuário alternar de aba
  useEffect(() => {
    carregarDadosDaAba();
  }, [aba]);

  const handleCadastrarMotivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDescricao.trim()) return;

    try {
      setSalvando(true);
      setErro('');

      if (aba === 'faltas') {
        await categoriasService.salvarMotivoFalta(novaDescricao.trim());
      } else if (aba === 'avarias') {
        await categoriasService.salvarMotivoAvaria(novaDescricao.trim());
      }

      setNovaDescricao('');
      await carregarDadosDaAba(); // Recarrega a aba atual com o novo item
    } catch (err: any) {
      setErro(err.message?.includes('duplicate') ? 'Este motivo já está cadastrado.' : 'Erro ao salvar o motivo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="w-full flex flex-col animate-fadeIn">
      
      {/* SELETOR DE SUB-ABAS (TABS MOBILE-FIRST) */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-5 w-full select-none">
        <button
          onClick={() => setAba('faltas')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            aba === 'faltas' ? 'bg-[#09797a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Faltas
        </button>
        <button
          onClick={() => setAba('avarias')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            aba === 'avarias' ? 'bg-[#09797a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Avarias
        </button>
        <button
          onClick={() => setAba('validade')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            aba === 'validade' ? 'bg-[#09797a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Validade
        </button>
      </div>

      {/* FEEDBACK DE ERRO */}
      {erro && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 font-medium text-center">
          {erro}
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO (OCULTO NA ABA VALIDADE, QUE É APENAS LEITURA) */}
      {aba !== 'validade' && (
        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 mb-5">
          <form onSubmit={handleCadastrarMotivo} className="w-full flex gap-2">
            <input
              type="text"
              placeholder={aba === 'faltas' ? "Novo motivo de falta" : "Novo motivo de avaria"}
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              disabled={salvando || loading}
              className="flex-1 bg-white border border-gray-300 rounded-xl px-3 h-10 text-sm outline-none focus:border-[#09797a]"
              required
            />
            <button
              type="submit"
              disabled={salvando || loading}
              className="bg-[#09797a] text-white font-bold px-4 rounded-xl text-xs h-10 active:scale-95 transition-all disabled:bg-gray-300"
            >
              + Add
            </button>
          </form>
        </div>
      )}

      {/* ÁREA DE EXIBIÇÃO DE CONTEÚDO */}
      <div className="w-full flex flex-col gap-2 overflow-y-auto max-h-80 pr-1 border border-gray-100 rounded-2xl p-3 bg-white shadow-inner">
        
        {loading ? (
          <div className="flex flex-col justify-center items-center py-8 w-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#09797a]"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            
            {/* RENDER DA ABA FALTAS */}
            {aba === 'faltas' && (
              motivosFalta.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nenhum motivo de falta cadastrado.</p>
              ) : (
                motivosFalta.map(m => (
                  <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-800 font-bold flex items-center">
                    <span className="text-[#09797a] mr-2.5">🚨</span> {m.descricao}
                  </div>
                ))
              )
            )}

            {/* RENDER DA ABA AVARIAS */}
            {aba === 'avarias' && (
              motivosAvaria.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nenhum motivo de avaria cadastrado.</p>
              ) : (
                motivosAvaria.map(m => (
                  <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-800 font-bold flex items-center">
                    <span className="text-[#e07a5f] mr-2.5">⚠️</span> {m.descricao}
                  </div>
                ))
              )
            )}

            {/* RENDER DA ABA VALIDADE (DIRETRIZES DO BANCO) */}
            {aba === 'validade' && (
              regrasValidade.map(r => {
                // Lógica de cores baseada nas regras de negócio estipuladas
                const corBadge = r.nome === 'Crítico' ? 'bg-red-100 text-red-700 border-red-200' :
                                 r.nome === 'Atenção' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                 'bg-green-100 text-green-700 border-green-200';
                return (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${corBadge}`}>
                      {r.nome}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">
                      {r.nome === 'Crítico' && `≤ ${r.regra_dias_max} dias`}
                      {r.nome === 'Atenção' && `${r.regra_dias_min} a ${r.regra_dias_max} dias`}
                      {r.nome === 'Normal' && `≥ ${r.regra_dias_min} dias`}
                    </span>
                  </div>
                );
              })
            )}

          </div>
        )}
      </div>
    </div>
  );
}