// Arquivo: src/pages/Cotacoes/NovaCotacao.tsx
import { useState, useMemo } from 'react';
import { cotacoesService } from './services/cotacoesService';
import { useFaltasPendentes } from './hooks/useFaltasPendentes';
import { useFornecedoresSugeridos } from './hooks/useFornecedoresSugeridos';
import { CardNotaFalta } from './components/CardNotaFalta';
import { CardFornecedor } from './components/CardFornecedor';
import type { ItemFaltaCotacaoDTO, FornecedorSugeridoDTO } from './types/cotacoes.types';

interface NovaCotacaoProps {
  compradorId: string;
  onVoltar: () => void;
  onSucesso: () => void;
}

interface LinkGerado {
  fornecedor: string;
  url: string;
}

export function NovaCotacao({ compradorId, onVoltar, onSucesso }: NovaCotacaoProps) {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState<Set<string>>(new Set());
  const [linksGerados, setLinksGerados] = useState<LinkGerado[]>([]);
  const [disparando, setDisparando] = useState(false);

  const { faltas, loading: loadingFaltas } = useFaltasPendentes();

  const setoresParaCotacao = useMemo(() => {
    const itens = (faltas || []).filter((f: ItemFaltaCotacaoDTO) => itensSelecionados.has(f.id));
    return Array.from(new Set(itens.map((i: ItemFaltaCotacaoDTO) => i.setor_id)));
  }, [faltas, itensSelecionados]);

  const { fornecedores, loading: loadingFornecedores } = useFornecedoresSugeridos(setoresParaCotacao);

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

  const gerarUUIDV4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleDispararCotacao = async () => {
    if (itensSelecionados.size === 0 || fornecedoresSelecionados.size === 0) return;

    try {
      setDisparando(true);

      const listaItensIds = Array.from(itensSelecionados);
      
      // 1. Mapeia os fornecedores gerando um par estável de Fornecedor + Token de acesso único
      const tokensMapeados = Array.from(fornecedoresSelecionados).map((fId: string) => {
        const f = (fornecedores || []).find((x: FornecedorSugeridoDTO) => x.fornecedor_id === fId);
        return {
          fornecedor_id: fId,
          vendedor_id: f?.vendedor_id || null,
          nome_fantasia: f?.nome_fantasia || 'Fornecedor',
          token: gerarUUIDV4() // Gerado uma única vez por fornecedor
        };
      });

      // 2. Envia exatamente os mesmos tokens gerados para persistência no Supabase
      await cotacoesService.criarRodadaCotacao({
        comprador_id: compradorId,
        nota_falta_ids: listaItensIds,
        fornecedores: tokensMapeados.map(t => ({
          fornecedor_id: t.fornecedor_id,
          vendedor_id: t.vendedor_id,
          token_acesso: t.token
        }))
      });

      // 3. Monta as URLs de visualização da tela usando exatamente as mesmas chaves do banco
      const baseUrl = window.location.origin;
      const linksMapped: LinkGerado[] = tokensMapeados.map(t => ({
        fornecedor: t.nome_fantasia,
        url: `${baseUrl}?token=${t.token}`
      }));

      setLinksGerados(linksMapped);
      setEtapa(3);
    } catch (error: any) {
      console.error(error);
      alert(`⚠️ Falha ao disparar rodada: ${error.message || error}`);
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)] relative">
        <div className="flex items-center gap-3 w-full mb-6 border-b border-gray-100 pb-4">
          <button
            type="button"
            onClick={() => etapa === 3 ? onSucesso() : setEtapa((prev) => (prev === 2 ? 1 : prev))}
            className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-bold text-xl leading-tight">Nova Cotação</h1>
            <p className="text-[11px] text-[#e07a5f] font-bold mt-0.5">
              {etapa === 3 && 'Links comerciais gerados'}
              {etapa === 2 && 'Passo 2 de 2: Fornecedores'}
              {etapa === 1 && 'Passo 1 de 2: Itens em Falta'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-240px)] pb-4">
          {etapa === 1 && (
            <>
              {loadingFaltas ? (
                <p className="text-center text-gray-500 mt-10 text-sm font-medium">Carregando faltas...</p>
              ) : !faltas || faltas.length === 0 ? (
                <p className="text-center text-gray-500 mt-10 text-sm">Nenhum item pendente.</p>
              ) : (
                faltas.map((item: ItemFaltaCotacaoDTO) => (
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
                <p className="text-center text-gray-500 mt-10 text-sm font-medium">Buscando fornecedores...</p>
              ) : !fornecedores || fornecedores.length === 0 ? (
                <p className="text-center text-gray-500 mt-10 text-sm">Nenhum fornecedor encontrado.</p>
              ) : (
                fornecedores.map((forn: FornecedorSugeridoDTO) => (
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

          {etapa === 3 && (
            <div className="flex flex-col gap-4 flex-1 justify-center">
              <div className="text-center py-2 select-none">
                <span className="text-4xl block mb-2">🚀</span>
                <h3 className="text-sm font-black text-gray-800 uppercase">Cotação Disparada!</h3>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Envie os links aos fornecedores:</p>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto max-h-64 pr-0.5">
                {linksGerados.map((link, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700 truncate max-w-[65%]">{link.fornecedor}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(link.url);
                          alert('Copiado!');
                        }}
                        className="text-[10px] bg-[#09797a] text-white font-bold px-3 py-1 rounded-lg"
                      >
                        Copiar
                      </button>
                    </div>
                    <input type="text" readOnly value={link.url} className="text-[10px] text-gray-400 bg-white border border-gray-200 px-3 py-2 rounded-xl w-full font-mono focus:outline-none" />
                  </div>
                ))}
              </div>

              <button type="button" onClick={onSucesso} className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold shadow-md mt-auto">
                Concluir e Voltar ao Painel
              </button>
            </div>
          )}
        </div>

        {etapa !== 3 && (
          <div className="pt-4 border-t border-gray-100 mt-auto flex justify-between items-center bg-white w-full">
            <span className="text-xs text-gray-500 font-bold tracking-wide">
              {etapa === 1 ? `${itensSelecionados.size} itens` : `${fornecedoresSelecionados.size} convites`}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={onVoltar} className="border border-gray-300 text-gray-500 px-4 py-3 rounded-3xl text-xs font-bold">Cancelar</button>
              {etapa === 1 ? (
                <button type="button" onClick={() => setEtapa(2)} disabled={itensSelecionados.size === 0} className="bg-[#09797a] text-white px-6 py-3 rounded-3xl text-xs font-bold disabled:opacity-50">Avançar</button>
              ) : (
                <button type="button" onClick={handleDispararCotacao} disabled={fornecedoresSelecionados.size === 0 || disparando} className="bg-[#09797a] text-white px-6 py-3 rounded-3xl text-xs font-bold disabled:opacity-50">
                  {disparando ? 'Processando...' : 'Disparar Cotação'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}