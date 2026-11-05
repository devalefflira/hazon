// src/pages/Vencimentos/components/PainelFiltros.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Eraser, Funnel } from 'lucide-react';
import type { TipoAcaoVencimento } from '../services/vencimentosService';
import { FILTROS_PADRAO, TIPOS_ACAO, contarFiltrosAtivos } from '../utils/vencimentosUtils';
import type { FiltrosVencimentos, OpcoesHierarquia, StatusAcaoFiltro } from '../utils/vencimentosUtils';

interface PainelFiltrosProps {
  filtros: FiltrosVencimentos;
  onChange: (filtros: FiltrosVencimentos) => void;
  opcoes: OpcoesHierarquia;
  rotuloPeriodo: string;
  mostrarStatusAcao?: boolean;
  mostrarTipoAcao?: boolean;
}

const classeCampo =
  'w-full h-9 text-xs bg-white border border-gray-200 px-2.5 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#09797a]/30 focus:border-[#09797a]';
const classeRotulo = 'text-[10px] font-bold text-gray-500 uppercase px-1';

export default function PainelFiltros({
  filtros,
  onChange,
  opcoes,
  rotuloPeriodo,
  mostrarStatusAcao = false,
  mostrarTipoAcao = false
}: PainelFiltrosProps) {
  const [aberto, setAberto] = useState(false);
  const ativos = contarFiltrosAtivos(filtros);

  const atualizar = (parcial: Partial<FiltrosVencimentos>) => onChange({ ...filtros, ...parcial });

  return (
    <div className="bg-teal-50/40 border border-teal-100 rounded-2xl">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] font-black uppercase text-[#09797a]"
      >
        <span className="flex items-center gap-2">
          <Funnel className="w-3.5 h-3.5" />
          Filtros
          {ativos > 0 && (
            <span className="bg-[#09797a] text-white rounded-full px-2 py-0.5 text-[9px]">{ativos}</span>
          )}
        </span>
        {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {aberto && (
        <div className="px-3.5 pb-3.5 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>{rotuloPeriodo} – de</label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => atualizar({ dataInicio: e.target.value })}
                className={classeCampo}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>{rotuloPeriodo} – até</label>
              <input
                type="date"
                value={filtros.dataFim}
                min={filtros.dataInicio || undefined}
                onChange={(e) => atualizar({ dataFim: e.target.value })}
                className={classeCampo}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Departamento</label>
              <select
                value={filtros.departamento}
                onChange={(e) => atualizar({ departamento: e.target.value, secao: '', categoria: '' })}
                className={classeCampo}
              >
                <option value="">Todos</option>
                {opcoes.departamentos.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Setor</label>
              <select
                value={filtros.secao}
                onChange={(e) => atualizar({ secao: e.target.value, categoria: '' })}
                className={classeCampo}
              >
                <option value="">Todos</option>
                {opcoes.secoes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Categoria</label>
              <select
                value={filtros.categoria}
                onChange={(e) => atualizar({ categoria: e.target.value })}
                className={classeCampo}
              >
                <option value="">Todas</option>
                {opcoes.categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {mostrarStatusAcao && (
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Status</label>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  ['TODOS', 'Todos'],
                  ['COM_ACAO', 'Com Ação Iniciada'],
                  ['SEM_ACAO', 'Sem Ação']
                ] as [StatusAcaoFiltro, string][]).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => atualizar({ statusAcao: valor })}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                      filtros.statusAcao === valor
                        ? 'bg-[#09797a] text-white border-[#09797a]'
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mostrarTipoAcao && (
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Tipo de Ação</label>
              <div className="flex gap-1.5 flex-wrap">
                {(['TODOS', ...TIPOS_ACAO] as (TipoAcaoVencimento | 'TODOS')[]).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => atualizar({ tipoAcao: tipo })}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                      filtros.tipoAcao === tipo
                        ? 'bg-[#09797a] text-white border-[#09797a]'
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {tipo === 'TODOS' ? 'Todos' : tipo === 'Negociação' ? 'Negociação c/ Fornecedor' : tipo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {ativos > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...FILTROS_PADRAO })}
              className="self-end flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-500 hover:text-red-600"
            >
              <Eraser className="w-3.5 h-3.5" /> Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
