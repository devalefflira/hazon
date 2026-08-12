// Arquivo: src/pages/Avarias/components/RegistrarAvariaModal.tsx
import { useState, useEffect } from 'react';
import { avariasService } from '../services/avariasService';

interface RegistrarAvariaModalProps {
  onSucesso: () => void;
  onFechar: () => void;
  usuarioId?: string;
  usuarioLogado?: any;
}

export function RegistrarAvariaModal({ onSucesso, onFechar, usuarioId, usuarioLogado }: RegistrarAvariaModalProps) {
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);

  const [motivos, setMotivos] = useState<any[]>([]);
  const [motivoId, setMotivoId] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [destinacao, setDestinacao] = useState('Descarte');
  const [observacao, setObservacao] = useState('');

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const carregarMotivos = async () => {
      try {
        const dados = await avariasService.listarMotivosAvaria();
        setMotivos(dados);
        if (dados.length > 0) setMotivoId(dados[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    carregarMotivos();
  }, []);

  useEffect(() => {
    if (!termoBusca.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await avariasService.buscarProdutos(termoBusca);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [termoBusca, produtoSelecionado]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!produtoSelecionado) {
      alert('Selecione um produto.');
      return;
    }

    try {
      setSalvando(true);

      const usuarioIdFinal = usuarioId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id || '00000000-0000-0000-0000-000000000000';

      await avariasService.cadastrarAvaria({
        usuario_id: usuarioIdFinal,
        produto_id: produtoSelecionado.id,
        motivo_avaria_id: motivoId,
        quantidade: Number(quantidade) || 1,
        preco_custo_na_perda: Number(produtoSelecionado.custoreal) || 0,
        destinacao: destinacao,
        observacao: observacao.trim()
      });

      alert('Avaria registrada com sucesso!');
      onSucesso();
      onFechar();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar avaria.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-[#09797a] font-black text-base uppercase">Registrar Perda / Avaria</h3>
          <button type="button" onClick={onFechar} className="text-gray-400 font-bold">✕</button>
        </div>

        <form onSubmit={handleSalvar} className="flex flex-col gap-3">
          
          {/* BUSCA DE PRODUTO */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Buscar Produto (CODPROD, EAN ou Nome)</label>
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                setProdutoSelecionado(null);
              }}
              placeholder="Digite para buscar..."
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-800"
            />

            {produtosEncontrados.length > 0 && !produtoSelecionado && (
              <div className="absolute top-16 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-gray-100">
                {produtosEncontrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProdutoSelecionado(p);
                      setTermoBusca(`${p.codprod} - ${p.descricao}`);
                      setProdutosEncontrados([]);
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 flex flex-col text-xs font-bold text-gray-800 uppercase"
                  >
                    <span>{p.codprod} - {p.descricao}</span>
                    <span className="text-[9px] font-mono text-gray-400 normal-case">
                      Custo: R$ {Number(p.custoreal || 0).toFixed(2)} | Dep: {p.departamento || 'GERAL'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PRODUTO SELECIONADO */}
          {produtoSelecionado && (
            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-2xl flex justify-between items-center text-xs font-bold text-gray-800">
              <div>
                <span className="text-[9px] font-black text-emerald-800 block uppercase">Produto Confirmado</span>
                <span>{produtoSelecionado.descricao}</span>
                <span className="block text-[10px] font-mono text-gray-400 mt-0.5">
                  Custo Unitário: R$ {Number(produtoSelecionado.custoreal || 0).toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProdutoSelecionado(null);
                  setTermoBusca('');
                }}
                className="text-red-500 font-bold text-[10px] px-2 py-1 bg-white rounded-lg border border-red-100"
              >
                Trocar
              </button>
            </div>
          )}

          {/* CAMPOS DE QUANTIDADE E MOTIVO */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase px-1">Quantidade Perdida</label>
              <input
                type="number"
                min={0.01}
                step="any"
                required
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-2xl font-bold text-gray-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase px-1">Motivo da Perda</label>
              <select
                value={motivoId}
                onChange={(e) => setMotivoId(e.target.value)}
                className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-2xl font-bold text-gray-800"
              >
                {motivos.map((m) => (
                  <option key={m.id} value={m.id}>{m.descricao.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* DESTINAÇÃO */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Destinação do Produto</label>
            <select
              value={destinacao}
              onChange={(e) => setDestinacao(e.target.value)}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-2xl font-bold text-gray-800"
            >
              <option value="Descarte">Descarte / Lixo</option>
              <option value="Devolução Fornecedor">Devolução ao Fornecedor</option>
              <option value="Consumo Interno">Consumo Interno</option>
              <option value="Doação">Doação</option>
            </select>
          </div>

          {/* OBSERVAÇÃO */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Observação Adicional</label>
            <input
              type="text"
              placeholder="Ex: Caixa amassada no descarregamento"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl font-bold text-gray-800"
            />
          </div>

          {/* AÇÕES */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-5 py-3 rounded-2xl text-xs font-bold bg-gray-100 text-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !produtoSelecionado}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              {salvando ? 'Gravando...' : 'Confirmar Perda'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}