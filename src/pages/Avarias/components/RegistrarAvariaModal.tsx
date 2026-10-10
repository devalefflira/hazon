// src/pages/Avarias/components/RegistrarAvariaModal.tsx
import { useState, useEffect } from 'react';
import { avariasService } from '../services/avariasService';
import { SeletorProdutoScanner, type ProdutoBusca } from '../../../components/SeletorProdutoScanner';

export interface RegistrarAvariaModalProps {
  onFechar?: () => void;
  onCancelar?: () => void;
  onVoltar?: () => void;
  onSucesso?: () => void;
  onSuccess?: () => void;
  onSalvar?: (dados: any) => Promise<void>;
  motivos?: any[];
  usuarioLogadoId?: string;
  [key: string]: any;
}

const DESTINACOES_OPCOES = [
  'Descarte',
  'Troca Fornecedor',
  'Consumo Interno',
  'Doação'
];

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
  onCancelar,
  onFechar,
  onVoltar,
  onSucesso,
  onSuccess,
  usuarioLogadoId
}: RegistrarAvariaModalProps) {
  const listaMotivosFinal = motivos && motivos.length > 0 ? motivos : MOTIVOS_PADRAO;

  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoBusca | null>(null);
  const [motivoId, setMotivoId] = useState(listaMotivosFinal[0]?.id || '');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [destinacao, setDestinacao] = useState(DESTINACOES_OPCOES[0]);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Ação unificada para voltar/cancelar
  const handleAcaoVoltar = () => {
    if (onVoltar) onVoltar();
    else if (onFechar) onFechar();
    else if (onCancelar) onCancelar();
  };

  useEffect(() => {
    if (listaMotivosFinal.length > 0 && !motivoId) {
      setMotivoId(listaMotivosFinal[0].id);
    }
  }, [listaMotivosFinal]);

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

    const payload = {
      produto_id: produtoSelecionado.id,
      motivo_avaria_id: motivoId,
      quantidade: Number(quantidade || 1),
      preco_custo_na_perda: Number(produtoSelecionado.custoreal || 0),
      destinacao,
      observacao: observacao.trim(),
      usuario_id: usuarioLogadoId
    };

    try {
      setSalvando(true);
      if (onSalvar) {
        await onSalvar(payload);
      } else {
        await avariasService.registrarAvaria(payload);
      }

      if (onSucesso) onSucesso();
      else if (onSuccess) onSuccess();
      else handleAcaoVoltar();
    } catch (err: any) {
      alert('Erro ao registrar avaria: ' + (err.message || 'Erro inesperado'));
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header em Tela Cheia com Botão de Voltar */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAcaoVoltar}
            className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">
              REGISTRAR AVARIA
            </h1>
            <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
              Lançamento Direto de Quebras e Perdas
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* BUSCA PRODUTO COM BIPAGEM VIA CÂMERA */}
        <SeletorProdutoScanner
          produtoSelecionadoId={produtoSelecionado?.id}
          onSelecionarProduto={(p) => setProdutoSelecionado(p)}
          tituloCard="LOCALIZAR PRODUTO AVARIADO (BIPAGEM / BUSCA)"
          placeholder="Bipe o código de barras ou digite descrição/código..."
        />

        {produtoSelecionado && (
          <div className="px-3.5 py-2.5 bg-teal-50/50 border border-teal-200/80 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="font-mono text-[10px] font-black text-[#09797a] block">
                CÓD: {produtoSelecionado.codprod} {produtoSelecionado.codbarra ? `| EAN: ${produtoSelecionado.codbarra}` : ''}
              </span>
              <span className="font-black text-slate-800 uppercase">
                {produtoSelecionado.descricao}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Custo na Perda</span>
              <span className="font-mono font-black text-emerald-800">
                R$ {Number(produtoSelecionado.custoreal || 0).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}

        {/* Motivo e Quantidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
              Motivo da Avaria *
            </label>
            <select
              value={motivoId}
              onChange={(e) => setMotivoId(e.target.value)}
              className="w-full h-11 text-xs bg-slate-50 border border-slate-300 px-3 rounded-2xl font-bold text-slate-800 uppercase outline-none focus:border-[#09797a] focus:bg-white"
            >
              {listaMotivosFinal.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.descricao.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
              Quantidade *
            </label>
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
              className="w-full h-11 text-xs bg-slate-50 border border-slate-300 px-3 rounded-2xl font-black text-slate-800 text-center outline-none focus:border-[#09797a] focus:bg-white"
            />
          </div>
        </div>

        {/* Destinação */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
            Destinação *
          </label>
          <select
            value={destinacao}
            onChange={(e) => setDestinacao(e.target.value)}
            className="w-full h-11 text-xs bg-slate-50 border border-slate-300 px-3 rounded-2xl font-bold text-slate-800 uppercase outline-none focus:border-[#09797a] focus:bg-white"
          >
            {DESTINACOES_OPCOES.map((d) => (
              <option key={d} value={d}>
                {d.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Observação */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
            Observação (Opcional)
          </label>
          <textarea
            rows={3}
            placeholder="Informe observações ou detalhes adicionais da perda..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-2xl font-bold text-slate-800 resize-none outline-none focus:border-[#09797a] focus:bg-white"
          />
        </div>

        {/* Ações */}
        <div className="pt-2 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={handleAcaoVoltar}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold uppercase transition-all cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={salvando || !produtoSelecionado}
            className="flex-2 py-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            {salvando ? 'Salvando...' : 'Confirmar e Salvar Avaria'}
          </button>
        </div>
      </form>
    </div>
  );
}