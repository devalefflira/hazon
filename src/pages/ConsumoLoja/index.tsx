// src/pages/ConsumoLoja/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { consumoLojaService } from './services/consumoLojaService';
import type { ConsumoLojaItemView } from './types/consumoLoja.types';
import NovoRegistroConsumo from './components/NovoRegistroConsumo';

interface ConsumoLojaProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

const LOCAIS_FILTRO = [
  'Todos',
  'Frente de Loja',
  'Crediário',
  'Limpeza',
  'Escritório',
  'Depósito',
  'Açougue',
  'Padaria',
  'Hortifruti'
];

export default function ConsumoLoja({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: ConsumoLojaProps) {
  const idUsuarioFinal = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;

  const [exibirNovo, setExibirNovo] = useState(false);
  const [itens, setItens] = useState<ConsumoLojaItemView[]>([]);
  const [loading, setLoading] = useState(false);

  // Controle de expansão dos filtros (padrão: recolhido)
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);

  // Filtros
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [departamento, setDepartamento] = useState<string>('TODOS');
  const [local, setLocal] = useState<string>('Todos');
  const [opcoesDepartamentos, setOpcoesDepartamentos] = useState<string[]>([]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const data = await consumoLojaService.buscarItensConsumo(
        dataInicio || undefined,
        dataFim || undefined,
        departamento !== 'TODOS' ? departamento : undefined,
        local !== 'Todos' ? local : undefined
      );
      setItens(data);

      const deptos = Array.from(new Set(data.map((i: any) => i.departamento).filter(Boolean))) as string[];
      setOpcoesDepartamentos(deptos);
    } catch (err: any) {
      console.error('Erro ao carregar consumo loja:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!exibirNovo) {
      carregarDados();
    }
  }, [dataInicio, dataFim, departamento, local, exibirNovo]);

  const valorTotalSoma = useMemo(() => {
    return itens.reduce((acc, curr) => acc + Number(curr.valor_total_item || 0), 0);
  }, [itens]);

  const formatarDataSegura = (dataStr?: string) => {
    if (!dataStr) return '-';
    const partes = dataStr.split('T')[0].split('-');
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }
    return dataStr;
  };

  const temFiltroAtivo = Boolean(dataInicio) || Boolean(dataFim) || departamento !== 'TODOS' || local !== 'Todos';

  if (exibirNovo) {
    return (
      <NovoRegistroConsumo
        usuarioId={idUsuarioFinal}
        onVoltar={() => setExibirNovo(false)}
        onSucesso={() => {
          setExibirNovo(false);
          carregarDados();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome || (() => window.history.back())}
              className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">CONSUMO LOJA</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
                Controle de Materiais e Produtos Consumidos Internamente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExibirNovo(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + NOVO REGISTRO
          </button>
        </div>

        {/* FILTROS (RETRÁTIL COM BOTÃO + / -) */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 transition-all">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Filtros de Pesquisa
              </span>
              {temFiltroAtivo && (
                <span className="w-2 h-2 rounded-full bg-[#09797a]" title="Filtros aplicados" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {temFiltroAtivo && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                    setDepartamento('TODOS');
                    setLocal('Todos');
                  }}
                  className="text-[10px] font-bold text-red-600 hover:underline uppercase mr-1"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltrosExpandidos((prev) => !prev)}
                className="w-7 h-7 rounded-xl bg-white border border-slate-300 text-[#09797a] font-black text-sm flex items-center justify-center shadow-sm hover:bg-slate-100 transition-all"
                title={filtrosExpandidos ? 'Recolher Filtros' : 'Expandir Filtros'}
              >
                {filtrosExpandidos ? '−' : '+'}
              </button>
            </div>
          </div>

          {/* CAMPOS EXPANSÍVEIS */}
          {filtrosExpandidos && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/80 animate-fadeIn">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data Inicial</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 outline-none focus:border-[#09797a]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data Final</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 outline-none focus:border-[#09797a]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Departamento</label>
                <select
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">TODOS</option>
                  {opcoesDepartamentos.map((dep) => (
                    <option key={dep} value={dep}>{dep.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Local</label>
                <select
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  {LOCAIS_FILTRO.map((loc) => (
                    <option key={loc} value={loc}>{loc.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* VALOR TOTAL */}
        <div className="bg-emerald-50/70 border border-emerald-200 px-4 py-3 rounded-2xl flex justify-between items-center">
          <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
            Valor Total do Consumo no Período:
          </span>
          <span className="font-mono text-base sm:text-lg font-black text-emerald-800">
            {valorTotalSoma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        {/* LISTAGEM DOS CARDS */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase">
              Carregando consumo...
            </div>
          ) : itens.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
              Nenhum registro de consumo encontrado para os filtros selecionados.
            </div>
          ) : (
            itens.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
              >
                <div className="min-w-0 flex-1">
                  {/* Código e Local */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.codprod && (
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        Cód: {item.codprod}
                      </span>
                    )}
                    <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      LOCAL: {item.local}
                    </span>
                  </div>

                  {/* Nome do Produto */}
                  <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase mt-1 leading-snug">
                    {item.descricao_produto}
                  </h3>

                  {/* Quantidade */}
                  <div className="text-[11px] text-slate-500 font-semibold mt-1">
                    QTD: <strong className="text-slate-800">{item.quantidade} {item.unidade_medida}</strong>
                  </div>

                  {/* Responsável, Data e Hora */}
                  <div className="text-[10px] text-slate-400 font-medium mt-1">
                    Resp: <strong className="text-slate-600">{item.usuario_nome}</strong>, em{' '}
                    <strong>{formatarDataSegura(item.data_registro)}</strong>, às{' '}
                    <strong>{item.hora_registro?.slice(0, 8)}</strong>
                  </div>

                  {/* Observação (se houver) */}
                  {item.observacao && (
                    <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                      Obs: {item.observacao}
                    </div>
                  )}
                </div>

                {/* Valor Total */}
                <div className="text-right flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto flex sm:flex-col justify-between items-end">
                  <span className="text-sm sm:text-base font-black text-emerald-800 font-mono">
                    R$ {item.valor_total_item.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}