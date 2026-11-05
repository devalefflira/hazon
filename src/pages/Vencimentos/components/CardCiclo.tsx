// src/pages/Vencimentos/components/CardCiclo.tsx
import { ChevronDown, ChevronUp, CircleCheck, Flag, Handshake, History, Repeat, Tag, Trash2 } from 'lucide-react';
import type { CicloVencimento, TipoAcaoVencimento } from '../services/vencimentosService';
import {
  ESTILO_ACAO,
  ROTULO_ACAO,
  TIPOS_ACAO,
  corDias,
  detalheAcao,
  formatarDataBR,
  formatarDataHoraBR,
  moeda,
  numeroBR,
  sequenciaAcoes,
  textoDias
} from '../utils/vencimentosUtils';

interface CardCicloProps {
  ciclo: CicloVencimento;
  expandido: boolean;
  destacado?: boolean;
  onAlternarHistorico: () => void;
  onAcao?: (tipo: TipoAcaoVencimento) => void;
  onFinalizar?: () => void;
  onReabrir?: () => void;
}

const ICONE: Record<TipoAcaoVencimento, typeof Tag> = {
  Oferta: Tag,
  Troca: Repeat,
  Descarte: Trash2,
  'Negociação': Handshake
};

const ROTULO_BOTAO: Record<TipoAcaoVencimento, string> = {
  Oferta: 'Nova Oferta',
  Troca: 'Trocar',
  Descarte: 'Descartar',
  'Negociação': 'Negociar'
};

export default function CardCiclo({
  ciclo,
  expandido,
  destacado = false,
  onAlternarHistorico,
  onAcao,
  onFinalizar,
  onReabrir
}: CardCicloProps) {
  const prod = ciclo.produtos;
  const unidade = prod?.unidade || 'UN';
  const finalizado = ciclo.status === 'Finalizado';
  const ultima = ciclo.acoes[ciclo.acoes.length - 1];
  const ofertaVigente = [...ciclo.acoes].reverse().find((a) => a.tipo === 'Oferta');

  return (
    <div
      id={`ciclo-${ciclo.id}`}
      className={`p-3.5 bg-gray-50 border rounded-2xl flex flex-col gap-2.5 transition-all ${
        destacado ? 'border-[#09797a] ring-2 ring-[#09797a]/20' : 'border-gray-200'
      }`}
    >
      {/* Cabeçalho */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">
              {ciclo.codigo_customizado}
            </span>
            <span className="text-[10px] font-mono font-bold text-gray-400">Cód: {prod?.codprod || 'N/A'}</span>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
              finalizado ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
            }`}>
              {finalizado ? 'Finalizado' : 'Em Curso'}
            </span>
          </div>
          <h4 className="font-black text-xs text-gray-800 uppercase mt-1">{prod?.descricao || 'PRODUTO NÃO ENCONTRADO'}</h4>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase mt-1 flex-wrap">
            <span>Lote: <strong className="text-gray-800">{ciclo.lote}</strong></span>
            <span>Qtd: <strong className="text-gray-800">{numeroBR(ciclo.quantidade)} {unidade}</strong></span>
            <span>Validade: <strong className="text-gray-800">{formatarDataBR(ciclo.data_validade)}</strong></span>
            {prod?.departamento && <span>Depto: <strong className="text-gray-800">{prod.departamento}</strong></span>}
          </div>
        </div>
        {!finalizado && (
          <span className={`text-[11px] font-black text-right shrink-0 ${corDias(ciclo.diasParaVencer)}`}>
            {textoDias(ciclo.diasParaVencer)}
          </span>
        )}
      </div>

      {/* Resumo */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {TIPOS_ACAO.map((t) => {
          const n = ciclo.acoes.filter((a) => a.tipo === t).length;
          if (n === 0) return null;
          return (
            <span key={t} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${ESTILO_ACAO[t].chip}`}>
              {t} {n > 1 ? `(${n})` : ''}
            </span>
          );
        })}
        {ofertaVigente && !finalizado && (
          <span className="text-[10px] font-bold text-gray-500">
            Oferta atual: <strong className="text-gray-800">{moeda(ofertaVigente.preco_oferta)}</strong> até {formatarDataBR(ofertaVigente.validade_oferta)}
          </span>
        )}
      </div>

      {finalizado ? (
        <div className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <div>Desfecho: <strong className="text-gray-800">{ciclo.desfecho || sequenciaAcoes(ciclo.acoes)}</strong></div>
          <div>Finalizado por {ciclo.finalizadoPorNome || 'SISTEMA'} em {formatarDataHoraBR(ciclo.finalizado_em)}</div>
          {ciclo.observacao_final && <div>Obs.: {ciclo.observacao_final}</div>}
        </div>
      ) : (
        ultima && (
          <div className="text-[10px] font-bold text-gray-500">
            Última ação: <span className={ESTILO_ACAO[ultima.tipo].texto}>{ROTULO_ACAO[ultima.tipo]}</span> • {ultima.usuarioNome} • {formatarDataHoraBR(ultima.created_at)}
          </div>
        )
      )}

      {/* Histórico */}
      <button
        type="button"
        onClick={onAlternarHistorico}
        className="self-start flex items-center gap-1.5 text-[10px] font-black uppercase text-[#09797a]"
      >
        <History className="w-3.5 h-3.5" /> Histórico ({ciclo.acoes.length + (finalizado ? 2 : 1)})
        {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expandido && (
        <ol className="relative border-l-2 border-gray-200 ml-1.5 pl-4 flex flex-col gap-3">
          <li className="relative">
            <span className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-gray-400 ring-4 ring-gray-50" />
            <div className="text-[11px] font-black text-gray-700 uppercase">Ciclo iniciado</div>
            <div className="text-[10px] font-mono font-bold text-gray-400">
              👤 {ciclo.iniciadoPorNome} • {formatarDataHoraBR(ciclo.iniciado_em)} • origem {ciclo.origem}
            </div>
          </li>
          {ciclo.acoes.map((a) => (
            <li key={a.id} className="relative">
              <span className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full ring-4 ring-gray-50 ${ESTILO_ACAO[a.tipo].ponto}`} />
              <div className={`text-[11px] font-black uppercase ${ESTILO_ACAO[a.tipo].texto}`}>{ROTULO_ACAO[a.tipo]}</div>
              <div className="text-[10px] font-bold text-gray-700 whitespace-normal">{detalheAcao(a, unidade)}</div>
              <div className="text-[10px] font-mono font-bold text-gray-400">👤 {a.usuarioNome} • {formatarDataHoraBR(a.created_at)}</div>
            </li>
          ))}
          {finalizado && (
            <li className="relative">
              <span className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-slate-700 ring-4 ring-gray-50" />
              <div className="text-[11px] font-black text-slate-700 uppercase">Ciclo finalizado</div>
              <div className="text-[10px] font-mono font-bold text-gray-400">
                👤 {ciclo.finalizadoPorNome || 'SISTEMA'} • {formatarDataHoraBR(ciclo.finalizado_em)}
              </div>
            </li>
          )}
        </ol>
      )}

      {/* Ações */}
      {!finalizado && onAcao && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-200">
          {TIPOS_ACAO.map((t) => {
            const Icone = ICONE[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => onAcao(t)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase border bg-white active:scale-95 transition-all ${ESTILO_ACAO[t].chip}`}
              >
                <Icone className="w-3.5 h-3.5" /> {ROTULO_BOTAO[t]}
              </button>
            );
          })}
          {onFinalizar && (
            <button
              type="button"
              onClick={onFinalizar}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-sm active:scale-95 transition-all"
            >
              <Flag className="w-3.5 h-3.5" /> Finalizar Ciclo
            </button>
          )}
        </div>
      )}

      {finalizado && onReabrir && (
        <div className="flex pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onReabrir}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-white border border-gray-200 text-gray-500 hover:text-[#09797a]"
          >
            <CircleCheck className="w-3.5 h-3.5" /> Reabrir ciclo
          </button>
        </div>
      )}
    </div>
  );
}
