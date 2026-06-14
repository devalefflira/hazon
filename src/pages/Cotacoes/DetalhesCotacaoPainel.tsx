// Arquivo: src/pages/Cotacoes/DetalhesCotacaoPainel.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { cotacoesService } from './services/cotacoesService';

interface DetalhesCotacaoPainelProps {
  cotacaoId: string;
  onVoltar: () => void;
  onSucesso: () => void;
}

interface PropostaItem {
  resposta_item_id: string;
  fornecedor: string;
  preco: number;
  prazo: number;
  pagamento: string;
}

interface ProdutoComProposta {
  id: string;
  descricao: string;
  codigo_barras: string | null;
  propostas: PropostaItem[];
}

export default function DetalhesCotacaoPainel({ cotacaoId, onVoltar, onSucesso }: DetalhesCotacaoPainelProps) {
  const [loading, setLoading] = useState(true);
  const [cotacaoMestre, setCotacaoMestre] = useState<any>(null);
  const [produtosComPropostas, setProdutosComPropostas] = useState<ProdutoComProposta[]>([]);
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => {
    async function carregarDadosAuditoria() {
      try {
        setLoading(true);

        const { data: mestre, error: errMestre } = await supabase
          .from('cotacoes_mestre')
          .select(`
            id, status, created_at,
            usuarios:comprador_id ( nome )
          `)
          .eq('id', cotacaoId)
          .single();

        if (errMestre) throw errMestre;
        setCotacaoMestre(mestre);

        const { data: itensVinculados, error: errItens } = await supabase
          .from('cotacoes_itens_vinculados')
          .select(`
            notas_falta (
              id,
              produtos ( id, descricao, codigo_barras )
            )
          `)
          .eq('cotacao_mestre_id', cotacaoId);

        if (errItens) throw errItens;

        const { data: vinculosForn, error: errVinculos } = await supabase
          .from('cotacoes_fornecedores_vinculados')
          .select('id')
          .eq('cotacao_mestre_id', cotacaoId);

        if (errVinculos) throw errVinculos;
        
        const listaIdsVinculos = (vinculosForn || []).map(f => f.id);

        let respostas: any[] = [];
        if (listaIdsVinculos.length > 0) {
          const { data: resData, error: errRespostas } = await supabase
            .from('cotacoes_respostas_itens')
            .select(`
              id, produto_id, preco_ofertado,
              vinculo:cotacao_fornecedor_id (
                prazo_entrega_dias, condicoes_pagamento,
                fornecedores ( nome_fantasia )
              )
            `)
            .in('cotacao_fornecedor_id', listaIdsVinculos);

          if (errRespostas) throw errRespostas;
          respostas = resData || [];
        }

        // 4. Montar o mapa agrupado por produto (Estrutura explícita à prova de falhas do build)
        const mapaProdutos: ProdutoComProposta[] = [];

        if (itensVinculados && itensVinculados.length > 0) {
          itensVinculados.forEach((iv: any) => {
            const produto = iv.notas_falta?.produtos;
            if (produto) {
              const propostasDoItem: PropostaItem[] = (respostas || [])
                .filter((r: any) => r.produto_id === produto.id)
                .map((r: any) => ({
                  resposta_item_id: String(r.id),
                  fornecedor: String(r.vinculo?.fornecedores?.nome_fantasia || 'Fornecedor'),
                  preco: Number(r.preco_ofertado || 0),
                  prazo: Number(r.vinculo?.prazo_entrega_dias || 0),
                  pagamento: String(r.vinculo?.condicoes_pagamento || 'A Combinar')
                }))
                .sort((a, b) => a.preco - b.preco);

              mapaProdutos.push({
                id: String(produto.id),
                descricao: String(produto.descricao),
                codigo_barras: produto.codigo_barras ? String(produto.codigo_barras) : null,
                propostas: propostasDoItem
              });
            }
          });
        }

        setProdutosComPropostas(mapaProdutos);
      } catch (err) {
        console.error('Erro ao carregar auditoria:', err);
      } finally {
        setLoading(false);
      }
    }

    carregarDadosAuditoria();
  }, [cotacaoId]);

  const handleConcluirRodada = async () => {
    const itensGanhadores = produtosComPropostas
      .map(p => p.propostas[0])
      .filter((prop): prop is PropostaItem => prop !== undefined)
      .map(p => ({ resposta_item_id: p.resposta_item_id }));

    if (itensGanhadores.length === 0) {
      alert('Nenhuma proposta comercial foi recebida para concluir esta cotação.');
      return;
    }

    try {
      setFinalizando(true);
      await cotacoesService.concluirCotacao({
        cotacao_mestre_id: cotacaoId,
        cenario_escolhido: 'Melhor Preço por Item',
        justificativa_escolha: 'Fechamento automatizado pelo Hazon baseado na auditoria de menor custo unitário.',
        itens_ganhadores: itensGanhadores
      });

      alert('🏆 Rodada concluída com sucesso! Ganhadores definidos e salvos na tabela definitiva.');
      onSucesso();
    } catch (err: any) {
      alert(`Erro ao fechar rodada: ${err.message}`);
    } finally {
      setFinalizando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
        <p className="text-sm font-medium text-gray-500">Montando cenários de auditoria...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 w-full mb-5 border-b border-gray-100 pb-4">
          <button onClick={onVoltar} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl">
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-black text-base uppercase leading-tight">Auditoria de Preços</h1>
            <p className="text-[10px] text-gray-400 font-mono font-bold">Ref: #{cotacaoId.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* LISTAGEM DOS PRODUTOS COM PROPOSTAS LADO A LADO */}
        <div className="flex-1 overflow-y-auto pr-0.5 max-h-[calc(100vh-230px)] pb-4 flex flex-col gap-4">
          {produtosComPropostas.map((prod) => (
            <div key={prod.id} className="border border-gray-200 rounded-3xl p-4 bg-gray-50/40 flex flex-col gap-2.5 shadow-sm">
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide leading-snug">{prod.descricao}</h4>
                {prod.codigo_barras && <span className="text-[9px] text-gray-400 font-mono">EAN: {prod.codigo_barras}</span>}
              </div>

              <div className="flex flex-col gap-2">
                {prod.propostas.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic font-medium py-1">Nenhuma resposta deste item ainda...</p>
                ) : (
                  prod.propostas.map((prop: PropostaItem, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-2xl border flex flex-col gap-1 transition-all ${
                        idx === 0 
                          ? 'bg-emerald-50/60 border-emerald-200 shadow-sm' 
                          : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[60%]">
                          {idx === 0 && '🥇 '} {prop.fornecedor}
                        </span>
                        <span className={`text-xs font-black ${idx === 0 ? 'text-emerald-700' : 'text-gray-800'}`}>
                          R$ {prop.preco.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                        <span>📦 Entrega: {prop.prazo}d úteis</span>
                        <span className="truncate max-w-[50%]">💳 {prop.pagamento}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* BOTÃO DE CONCLUSÃO NO RODAPÉ OPERACIONAL */}
        {cotacaoMestre?.status !== 'Concluída' && (
          <div className="pt-4 border-t border-gray-100 mt-auto">
            <button
              onClick={handleConcluirRodada}
              disabled={finalizando || produtosComPropostas.some(p => p.propostas.length === 0)}
              className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold shadow-md active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {finalizando ? 'Processando Fechamento...' : 'Aprovar e Fechar Cotação'}
            </button>
            {produtosComPropostas.some(p => p.propostas.length === 0) && (
              <p className="text-[9px] text-center text-amber-600 font-bold mt-1.5 px-2">
                ⚠️ Aguardando que todos os fornecedores respondam para liberar a finalização.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}