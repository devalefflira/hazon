import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
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
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState<Set<string>>(new Set());
  const [linksGerados, setLinksGerados] = useState<{ fornecedor: string; url: string }[]>([]);

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

    try {
      // 1. Criar a Cotação Mestre
      const { data: mestre, error: errMestre } = await supabase
        .from('cotacoes_mestre')
        .insert([{ comprador_id: compradorId, status: 'Aberta' }])
        .select('id').single();

      if (errMestre) throw errMestre;

      // 2. Vincular os Itens (Notas de Falta)
      const itensPayload = Array.from(itensSelecionados).map(id => ({
        cotacao_mestre_id: mestre.id,
        nota_falta_id: id
      }));
      const { error: errItens } = await supabase.from('cotacao_itens_vinculados').insert(itensPayload);
      if (errItens) throw errItens;

      // 3. Vincular Fornecedores e Gerar os Tokens de Acesso
      const validadeToken = new Date();
      validadeToken.setDate(validadeToken.getDate() + 5);

      const fornPayload = Array.from(fornecedoresSelecionados).map(fId => {
        const f = fornecedores.find(x => x.fornecedor_id === fId);
        return {
          cotacao_mestre_id: mestre.id,
          fornecedor_id: fId,
          vendedor_id: f?.vendedor_id || null,
          token_validade: validadeToken.toISOString()
        };
      });

      const { data: tokensInseridos, error: errTokens } = await supabase
        .from('cotacoes_fornecedores_vinculados')
        .insert(fornPayload)
        .select(`
          token_acesso,
          fornecedores ( nome_fantasia )
        `);

      if (errTokens) throw errTokens;

      // 4. Atualizar o status das notas de falta para "Em Cotação"
      const { error: errUpdateFalta } = await supabase
        .from('notas_falta')
        .update({ status_cotacao: 'Em Cotação' })
        .in('id', Array.from(itensSelecionados));

      if (errUpdateFalta) throw errUpdateFalta;

      // 5. Montar links dinâmicos baseados no domínio atual do Hazon
      const baseUrl = window.location.origin;
      const linksMapped = (tokensInseridos || []).map((t: any) => ({
        fornecedor: t.fornecedores?.nome_fantasia || 'Fornecedor',
        url: `${baseUrl}?token=${t.token_acesso}`
      }));

      setLinksGerados(linksMapped);
      setEtapa(3 as any); // Move para a tela de Launchpad de links
    } catch (error: any) {
      console.error('Erro no disparo da cotação:', error);
      alert(`⚠️ Falha ao disparar cotação: ${error.message || error}`);
    }
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

          {(etapa as any) === 3 && (
            <div className="flex flex-col gap-4 animate-fadeIn flex-1 justify-center">
              <div className="text-center py-2 select-none">
                <span className="text-4xl block mb-2">🚀</span>
                <h3 className="text-sm font-black text-gray-800 uppercase">Cotação Disparada!</h3>
                <p className="text-[11px] text-gray-400 font-medium mt-1">
                  Copie os links abaixo e envie aos fornecedores correspondentes:
                </p>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto max-h-64 pr-0.5">
                {linksGerados.map((link, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700 truncate max-w-[65%]">{link.fornecedor}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(link.url);
                          alert(`Link de "${link.fornecedor}" copiado com sucesso!`);
                        }}
                        className="text-[10px] bg-[#09797a] text-white font-bold px-3 py-1 rounded-lg active:scale-90 transition-all shadow-sm"
                      >
                        Copiar
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={link.url}
                      className="text-[10px] text-gray-400 bg-white border border-gray-200 px-3 py-2 rounded-xl w-full font-mono focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={onSucesso}
                className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold shadow-md mt-auto active:scale-95 transition-all"
              >
                Concluir e Voltar ao Painel
              </button>
            </div>
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