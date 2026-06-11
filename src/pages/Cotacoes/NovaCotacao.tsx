import { useState, useMemo } from 'react';
import { useFaltasPendentes } from './hooks/useFaltasPendentes';
import { useFornecedoresSugeridos } from './hooks/useFornecedoresSugeridos';
import { useCriarCotacao } from './hooks/useCriarCotacao';
import { CardNotaFalta } from './components/CardNotaFalta';
import { CardFornecedor } from './components/CardFornecedor';

interface NovaCotacaoProps {
  compradorId: string;
  onVoltar: () => void;
  onSucesso: () => void;
}

export default function NovaCotacao({ compradorId, onVoltar, onSucesso }: NovaCotacaoProps) {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState<Set<string>>(new Set());

  const { faltas, loading: loadingFaltas } = useFaltasPendentes();
  
  // Deriva os setores únicos baseados nas faltas selecionadas para sugerir fornecedores
  const setoresParaCotacao = useMemo(() => {
    const itens = faltas.filter(f => itensSelecionados.has(f.id));
    return Array.from(new Set(itens.map(i => i.setor_id)));
  }, [faltas, itensSelecionados]);

  const { fornecedores, loading: loadingFornecedores } = useFornecedoresSugeridos(setoresParaCotacao);
  const { criarCotacao, loading: salvando } = useCriarCotacao();

  const handleToggleItem = (id: string) => {
    setItensSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleFornecedor = (id: string) => {
    setFornecedoresSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDisparar = async () => {
    if (itensSelecionados.size === 0 || fornecedoresSelecionados.size === 0) return;
    
    // Mapeia os fornecedores para o payload exigido incluindo o vendedor_id correspondente
    const fornecedoresPayload = Array.from(fornecedoresSelecionados).map(fId => {
      const f = fornecedores.find(x => x.fornecedor_id === fId);
      return { fornecedor_id: fId, vendedor_id: f?.vendedor_id };
    });

    const sucesso = await criarCotacao({
      comprador_id: compradorId,
      nota_falta_ids: Array.from(itensSelecionados),
      fornecedores: fornecedoresPayload
    });

    if (sucesso) onSucesso();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)] relative">
        
        {/* CABEÇALHO COM IDENTIDADE OPERACIONAL DO HAZON */}
        <div className="flex items-center gap-3 w-full mb-6 border-b border-gray-100 pb-4">
          <button 
            onClick={etapa === 1 ? onVoltar : () => setEtapa(1)} 
            className="p-2 hover:bg-gray-50 rounded-full active:scale-90 transition-all text-[#09797a] font-bold text-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-bold text-xl leading-tight">Nova Cotação</h1>
            <p className="text-[11px] text-[#e07a5f] font-bold mt-0.5">
              Passo {etapa} de 2: {etapa === 1 ? 'Itens em Falta' : 'Fornecedores'}
            </p>
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO COM ROLAGEM MÓVEL INTERNA COMPATÍVEL */}
        <div className="flex-1 overflow-y-auto pr-0.5 max-h-[calc(100vh-240px)] pb-4">
          {etapa === 1 && (
            <>
              {loadingFaltas ? (
                <p className="text-center text-gray-500 mt-10 text-sm font-medium">Carregando faltas...</p>
              ) : faltas.length === 0 ? (
                <p className="text-center text-gray-500 mt-10 text-sm">Nenhum item pendente para cotação.</p>
              ) : (
                faltas.map(item => (
                  <CardNotaFalta 
                    key={item.id} 
                    item={item} 
                    selecionado={itensSelecionados.has(item.id)} 
                    onToggle={handleToggleItem} 
                  />
                ))
              )}
            </>
          )}

          {etapa === 2 && (
            <>
              {loadingFornecedores ? (
                <p className="text-center text-gray-500 mt-10 text-sm font-medium">Buscando fornecedores compatíveis...</p>
              ) : !fornecedores || fornecedores.length === 0 ? (
                <p className="text-center text-gray-500 mt-10 text-sm">Nenhum fornecedor encontrado para os setores selecionados.</p>
              ) : (
                fornecedores.map(forn => (
                  <CardFornecedor 
                    key={forn.fornecedor_id} 
                    fornecedor={forn} 
                    selecionado={fornecedoresSelecionados.has(forn.fornecedor_id)} // <-- RETORNANDO BOOLEANO PURO CONFORME EXIGIDO
                    onToggle={handleToggleFornecedor} 
                  />
                ))
              )}
            </>
          )}
        </div>

        {/* BARRA DE BOTÕES ADAPTADA AO RODAPÉ DO EMBREAGUAGEM */}
        <div className="pt-4 border-t border-gray-100 mt-auto flex justify-between items-center bg-white w-full">
          <span className="text-xs text-gray-500 font-bold tracking-wide">
            {etapa === 1 ? `${itensSelecionados.size} itens` : `${fornecedoresSelecionados.size} convites`}
          </span>
          
          {etapa === 1 ? (
            <button 
              onClick={() => setEtapa(2)}
              disabled={itensSelecionados.size === 0}
              className="bg-[#09797a] text-white px-6 py-3 rounded-3xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-all shadow-sm"
            >
              Avançar
            </button>
          ) : (
            <button 
              onClick={handleDisparar}
              disabled={fornecedoresSelecionados.size === 0 || salvando}
              className="bg-[#09797a] text-white px-6 py-3 rounded-3xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-all shadow-sm flex items-center gap-2"
            >
              {salvando ? 'Processando...' : 'Disparar Cotação'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}