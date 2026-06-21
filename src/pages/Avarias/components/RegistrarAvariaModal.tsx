// Arquivo: src/pages/Avarias/components/RegistrarAvariaModal.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { avariasService } from '../services/avariasService';
import type { MotivoAvariaDTO, DestinacaoAvaria } from '../types/avarias.types';

interface RegistrarAvariaModalProps {
  usuarioId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

interface ProdutoFiltro {
  id: string;
  descricao: string;
  codigo_barras: string;
  sigla_unidade: string;
}

export function RegistrarAvariaModal({ usuarioId, onFechar, onSucesso }: RegistrarAvariaModalProps) {
  const [motivos, setMotivos] = useState<MotivoAvariaDTO[]>([]);
  const [loadingForm, setLoadingForm] = useState(true);
  const [submetendo, setSubmetendo] = useState(false);

  // Estados de Busca do Produto
  const [busca, setBusca] = useState('');
  const [produtosSugeridos, setProdutosSugeridos] = useState<ProdutoFiltro[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoFiltro | null>(null);

  // Campos do Registro
  const [motivoId, setMotivoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [destinacao, setDestinacao] = useState<DestinacaoAvaria>('Descarte');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    async function inicializarModal() {
      try {
        setLoadingForm(true);
        const listaMotivos = await avariasService.listarMotivos();
        setMotivos(listaMotivos);
        if (listaMotivos.length > 0) setMotivoId(listaMotivos[0].id);
      } catch (err) {
        console.error('Erro ao preparar playbook de avarias:', err);
      } finally {
        setLoadingForm(false);
      }
    }
    inicializarModal();
  }, []);

  // Procura reativa de produtos baseada no input de digitação/leitura
  useEffect(() => {
    async function filtrarProdutos() {
      if (busca.trim().length < 2) {
        setProdutosSugeridos([]);
        return;
      }
      try {
        const { data } = await supabase
          .from('produtos')
          .select(`
            id, descricao, codigo_barras,
            unidades_medida:unidade_medida_id ( sigla )
          `)
          .or(`codigo_barras.ilike.%${busca}%,descricao.ilike.%${busca}%`)
          .limit(4);

        const formatados = (data || []).map((p: any) => ({
          id: p.id,
          descricao: p.descricao,
          codigo_barras: p.codigo_barras,
          sigla_unidade: p.unidades_medida?.sigla || 'UN'
        }));
        setProdutosSugeridos(formatados);
      } catch (err) {
        console.error(err);
      }
    }
    const timer = setTimeout(filtrarProdutos, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  const handleSalvarAvaria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado || !motivoId || Number(quantidade) <= 0) {
      alert('Determine o produto, o motivo da quebra e uma quantidade válida.');
      return;
    }

    try {
      setSubmetendo(true);
      await avariasService.registrarAvaria({
        usuario_id: usuarioId,
        produto_id: produtoSelecionado.id,
        motivo_avaria_id: motivoId,
        quantidade: Number(quantidade),
        destinacao: destinacao,
        observacao: observacao
      });

      alert('📦 Quebra lançada e subtraída das disponibilidades operacionais!');
      onSucesso();
    } catch (err: any) {
      alert(`Falha no lançamento: ${err.message || err}`);
    } finally {
      setSubmetendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 font-sans backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-4xl shadow-2xl px-5 py-6 flex flex-col max-h-[calc(100vh-40px)] animate-scale-up">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
          <h2 className="text-[#09797a] font-black text-base uppercase tracking-wide">Registrar Quebra / Avaria</h2>
          <button type="button" onClick={onFechar} className="text-gray-400 font-bold hover:text-gray-600 text-lg p-1">✕</button>
        </div>

        {loadingForm ? (
          <p className="text-center text-gray-400 font-bold text-xs py-12">Carregando parâmetros operacionais...</p>
        ) : (
          <form onSubmit={handleSalvarAvaria} className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-4">
            
            {/* BUSCA DE PRODUTO */}
            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Identificar Produto</label>
              {produtoSelecionado ? (
                <div className="w-full bg-teal-50/50 border border-teal-200 rounded-2xl px-4 py-2.5 flex justify-between items-center animate-fade-in">
                  <div className="truncate max-w-[85%]">
                    <span className="text-[11px] font-black text-teal-800 uppercase block truncate">{produtoSelecionado.descricao}</span>
                    <span className="text-[9px] text-gray-400 font-mono block">EAN: {produtoSelecionado.codigo_barras}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProdutoSelecionado(null)}
                    className="text-red-500 font-bold text-xs p-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="DIGITE O NOME OU LEIA O CÓDIGO DE BARRAS..."
                    className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 uppercase"
                  />
                  {/* DROPDOWN DE RETORNO DO AUTOCOMPLETE */}
                  {produtosSugeridos.length > 0 && (
                    <div className="absolute top-16 left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden z-10 flex flex-col">
                      {produtosSugeridos.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setProdutoSelecionado(p);
                            setProdutosSugeridos([]);
                            setBusca('');
                          }}
                          className="px-4 py-2.5 hover:bg-teal-50/40 cursor-pointer border-b border-gray-50 last:border-0 text-left"
                        >
                          <span className="text-xs font-black text-gray-700 uppercase block truncate">{p.descricao}</span>
                          <span className="text-[9px] text-gray-400 font-mono">EAN: {p.codigo_barras}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* SELETOR DE MOTIVO */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Motivo Encontrado</label>
              <select
                value={motivoId}
                onChange={(e) => setMotivoId(e.target.value)}
                className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 uppercase"
              >
                {motivos.map(m => (
                  <option key={m.id} value={m.id}>{m.descricao}</option>
                ))}
              </select>
            </div>

            {/* QUANTIDADE E DESTINAÇÃO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Quantidade</label>
                <div className="flex bg-gray-50 border border-gray-200 rounded-2xl px-4 items-center focus-within:border-[#09797a]">
                  <input
                    type="number"
                    step="any"
                    required
                    value={quantidade}
                    // CORREÇÃO: Método corrigido de setQuantity para setQuantidade
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 text-xs bg-transparent focus:outline-none font-bold text-gray-700"
                  />
                  <span className="text-[10px] font-black text-gray-400 uppercase ml-1">
                    {produtoSelecionado ? produtoSelecionado.sigla_unidade : 'UN'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Destinação</label>
                <select
                  value={destinacao}
                  onChange={(e) => setDestinacao(e.target.value as DestinacaoAvaria)}
                  className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
                >
                  <option value="Descarte">DESCARTE</option>
                  <option value="Devolução Fornecedor">DEVOLUÇÃO</option>
                  <option value="Troca Comercial">TROCA COMERCIAL</option>
                  <option value="Uso Interno">USO INTERNO</option>
                </select>
              </div>
            </div>

            {/* OBSERVAÇÃO */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Observações Complementares</label>
              <textarea
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="EX: PRODUTO CAIU DA EMPILHADEIRA DURANTE A SEPARAÇÃO..."
                className="w-full text-xs bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 placeholder:text-gray-300 resize-none uppercase"
              />
            </div>

            {/* BOTÃO MASTER */}
            <button
              type="submit"
              disabled={submetendo || !produtoSelecionado}
              className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold tracking-wide uppercase shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex justify-center items-center mt-2"
            >
              {submetendo ? 'Registrando Perda...' : 'Confirmar e Baixar Item'}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}