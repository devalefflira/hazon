// src/pages/Avarias/components/EditarAvariaModal.tsx
import { useState, useEffect } from 'react';
import { avariasService } from '../services/avariasService';
import type { AvariaRecord } from '../types/avarias.types';

export interface EditarAvariaModalProps {
  avaria: AvariaRecord;
  onVoltar: () => void;
  onSucesso: () => void;
}

interface MotivoOpcao {
  id: string;
  descricao: string;
}

// Mesmas opções do cadastro (RegistrarAvariaModal), para manter consistência
const DESTINACOES_OPCOES = ['Descarte', 'Troca Fornecedor', 'Consumo Interno', 'Doação'];

export default function EditarAvariaModal({ avaria, onVoltar, onSucesso }: EditarAvariaModalProps) {
  const prod = avaria.produtos;

  const [motivos, setMotivos] = useState<MotivoOpcao[]>([]);
  const [motivoId, setMotivoId] = useState(avaria.motivo_avaria_id || '');
  const [quantidade, setQuantidade] = useState<number | ''>(Number(avaria.quantidade || 0));
  const [destinacao, setDestinacao] = useState(avaria.destinacao || DESTINACOES_OPCOES[0]);
  const [observacao, setObservacao] = useState(avaria.observacao || '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;

    avariasService
      .listarMotivosAvaria()
      .then((lista) => {
        if (ativo) setMotivos(lista);
      })
      .catch((err) => console.error('Erro ao carregar motivos de avaria:', err));

    return () => {
      ativo = false;
    };
  }, []);

  // Garante que o motivo atual do registro apareça mesmo se não estiver na lista carregada
  const opcoesMotivo: MotivoOpcao[] =
    avaria.motivos_avaria && !motivos.some((m) => m.id === avaria.motivo_avaria_id)
      ? [{ id: avaria.motivos_avaria.id, descricao: avaria.motivos_avaria.descricao }, ...motivos]
      : motivos;

  // Garante que a destinação atual (ex.: valor legado) apareça como opção
  const opcoesDestinacao = DESTINACOES_OPCOES.includes(destinacao)
    ? DESTINACOES_OPCOES
    : [destinacao, ...DESTINACOES_OPCOES];

  const qtdNumerica = Number(quantidade || 0);
  const perdaAtualizada = qtdNumerica * Number(avaria.preco_custo_na_perda || 0);

  const formatarMoedaBR = (valor: number) =>
    valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(qtdNumerica > 0)) {
      alert('Informe uma quantidade válida.');
      return;
    }
    if (!motivoId) {
      alert('Selecione o motivo da avaria.');
      return;
    }

    try {
      setSalvando(true);
      await avariasService.atualizarAvaria(avaria.id, {
        motivo_avaria_id: motivoId,
        quantidade: qtdNumerica,
        destinacao,
        observacao: observacao.trim()
      });
      onSucesso();
    } catch (err: any) {
      alert('Erro ao editar avaria: ' + (err.message || 'Erro inesperado'));
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
            onClick={onVoltar}
            className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">
              EDITAR AVARIA
            </h1>
            <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
              Correção de Registro • #{avaria.codigo_customizado}
            </p>
          </div>
        </div>
      </div>

      {/* Produto (somente leitura) */}
      <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-1 text-xs">
        <span className="font-mono text-[10px] font-black text-slate-500">
          CÓD: {prod?.codprod || '-'}
        </span>
        <span className="font-black text-slate-800 uppercase">
          {prod?.descricao || 'PRODUTO NÃO IDENTIFICADO'}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">
          O produto não é editável nesta tela. Para trocar o item, exclua o registro e lance novamente.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
              {opcoesMotivo.map((m) => (
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
            {opcoesDestinacao.map((d) => (
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

        {/* Prévia da perda recalculada (custo na perda original é mantido) */}
        <div className="px-3.5 py-2.5 bg-red-50/40 border border-red-200/80 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase">
            Custo unit. na perda: R$ {formatarMoedaBR(Number(avaria.preco_custo_na_perda || 0))}
          </span>
          <span className="font-mono font-black text-red-700">
            Perda: R$ {formatarMoedaBR(perdaAtualizada)}
          </span>
        </div>

        {/* Ações */}
        <div className="pt-2 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onVoltar}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold uppercase transition-all cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex-[2] py-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
