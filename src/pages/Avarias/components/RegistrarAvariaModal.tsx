// Arquivo: src/pages/Avarias/components/RegistrarAvariaModal.tsx
import { useState, useEffect } from 'react';
import { avariasService } from '../services/avariasService';

interface RegistrarAvariaModalProps {
  motivos: any[];
  onSalvar: (dados: any) => Promise<void>;
  onCancelar: () => void;
}

const DESTINACOES_OPCOES = [
  'Descarte',
  'Troca Fornecedor',
  'Consumo Interno',
  'Doação'
];

// Lista de fallback caso a tabela do banco não retorne itens
const MOTIVOS_PADRAO = [
  { id: 'm1', descricao: 'Avaria (Geral)' },
  { id: 'm2', descricao: 'Vencimento' },
  { id: 'm3', descricao: 'Erros no Manuseio e Empilhamento' },
  { id: 'm4', descricao: 'Quebra da Cadeia do Frio (Ruptura Térmica)' },
  { id: 'm5', descricao: 'Embalagens Inadequadas ou Fragilizadas' },
  { id: 'm6', descricao: 'Pragas Urbanas e Roedores' }
];

export default function RegistrarAvariaModal({
  motivos,
  onSalvar,
  onCancelar
}: RegistrarAvariaModalProps) {
  const listaMotivosFinal = motivos && motivos.length > 0 ? motivos : MOTIVOS_PADRAO;

  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);

  const [motivoId, setMotivoId] = useState(listaMotivosFinal[0]?.id || '');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [destinacao, setDestinacao] = useState(DESTINACOES_OPCOES[0]);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (listaMotivosFinal.length > 0 && !motivoId) {
      setMotivoId(listaMotivosFinal[0].id);
    }
  }, [listaMotivosFinal]);

  // Autocomplete de produtos
  useEffect(() => {
    if (!termoBuscaProduto.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await avariasService.buscarProdutos(termoBuscaProduto);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBuscaProduto, produtoSelecionado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione um produto.');
      return;
    }
    if (!motivoId) {
      alert('Selecione o motivo da avaria.');
      return;
    }

    try {
      setSalvando(true);
      await onSalvar({
        produto_id: produtoSelecionado.id,
        motivo_avaria_id: motivoId,
        quantidade: Number(quantidade || 1),
        preco_custo_na_perda: Number(produtoSelecionado.custoreal || 0),
        destinacao,
        observacao: observacao.trim()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
          <h3 className="text-[#09797a] font-black text-base uppercase">REGISTRAR AVARIA</h3>
          <button type="button" onClick={onCancelar} className="text-gray-400 font-bold text-base">✕</button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-3 pr-1 flex-1">
          {/* BUSCA PRODUTO */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Buscar Produto *</label>
            <input
              type="text"
              required
              value={termoBuscaProduto}
              onChange={(e) => {
                setTermoBuscaProduto(e.target.value);
                setProdutoSelecionado(null);
              }}
              placeholder="Bipe o EAN ou digite o nome/código..."
              className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
            />

            {produtosEncontrados.length > 0 && !produtoSelecionado && (
              <div className="absolute top-15 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-20 divide-y divide-gray-100">
                {produtosEncontrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProdutoSelecionado(p);
                      setTermoBuscaProduto(`${p.codprod} - ${p.descricao}`);
                      setProdutosEncontrados([]);
                    }}
                    className="w-full text-left p-3 hover:bg-emerald-50/50 flex flex-col text-xs font-bold text-gray-800 uppercase"
                  >
                    <span>{p.codprod} - {p.descricao}</span>
                    <span className="text-[10px] text-gray-400 font-mono">Custo: R$ {p.custoreal || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Motivo da Avaria *</label>
              <select
                value={motivoId}
                onChange={(e) => setMotivoId(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
              >
                {listaMotivosFinal.map((m) => (
                  <option key={m.id} value={m.id}>{m.descricao.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Quantidade *</label>
              <input
                type="number"
                min={0.01}
                step="any"
                required
                value={quantidade}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuantidade(val === '' ? '' : Number(val));
                }}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Destinação</label>
            <select
              value={destinacao}
              onChange={(e) => setDestinacao(e.target.value)}
              className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
            >
              {DESTINACOES_OPCOES.map((d) => (
                <option key={d} value={d}>{d.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Observação (Opcional)</label>
            <textarea
              rows={2}
              placeholder="Detalhes adicionais..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 resize-none"
            />
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
            disabled={salvando || !produtoSelecionado}
            className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            {salvando ? 'Salvando...' : 'Salvar Avaria'}
          </button>
        </div>
      </form>
    </div>
  );
}