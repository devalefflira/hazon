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
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header Fixo */}
      <div className="bg-[#09797a] text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={etapa === 1 ? onVoltar : () => setEtapa(1)} className="text-xl font-bold p-1">
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">Nova Cotação</h1>
            <p className="text-[11px] opacity-80">
              Passo {etapa} de 2: {etapa === 1 ? 'Itens em Falta' : 'Fornecedores'}
            </p>
          </div>
        </div>
      </div>

      {/* Área de Rolagem de Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
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
            ) : fornecedores.length === 0 ? (
              <p className="text-center text-gray-500 mt-10 text-sm">Nenhum fornecedor encontrado para os setores selecionados.</p>
            ) : (
              fornecedores.map(forn => (
                <CardFornecedor 
                  key={forn.fornecedor_id} 
                  fornecedor={forn} 
                  selecionado={fornecedoresSelecionados.has(forn.fornecedor_id)} 
                  onToggle={handleToggleFornecedor} 
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Bottom Bar Fixa */}
      <div className="bg-white border-t p-4 sticky bottom-0 z-10 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <span className="text-xs text-gray-600 font-medium">
          {etapa === 1 ? `${itensSelecionados.size} itens` : `${fornecedoresSelecionados.size} convites`}
        </span>
        
        {etapa === 1 ? (
          <button 
            onClick={() => setEtapa(2)}
            disabled={itensSelecionados.size === 0}
            className="bg-[#09797a] text-white px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-opacity"
          >
            Avançar
          </button>
        ) : (
          <button 
            onClick={handleDisparar}
            disabled={fornecedoresSelecionados.size === 0 || salvando}
            className="bg-[#09797a] text-white px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            {salvando ? 'Processando...' : 'Disparar Cotação'}
          </button>
        )}
      </div>
    </div>
  );
}