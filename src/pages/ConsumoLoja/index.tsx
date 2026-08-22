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

  // Edição
  const [itemEmEdicao, setItemEmEdicao] = useState<ConsumoLojaItemView | null>(null);
  const [novaQtd, setNovaQtd] = useState<number>(1);
  const [novoLocal, setNovoLocal] = useState<string>('Frente de Loja');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Filtros
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
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
    if (!exibirNovo) carregarDados();
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

  const handleSalvarEdicao = async () => {
    if (!itemEmEdicao) return;
    try {
      setSalvandoEdicao(true);
      const custoUnitario = itemEmEdicao.quantidade > 0 
        ? itemEmEdicao.valor_total_item / itemEmEdicao.quantidade 
        : 0;

      await consumoLojaService.atualizarItemConsumo(
        itemEmEdicao.id,
        novaQtd,
        novoLocal,
        custoUnitario
      );

      setItemEmEdicao(null);
      carregarDados();
    } catch (err: any) {
      alert('Erro ao atualizar item: ' + err.message);
    } finally {
      setSalvandoEdicao(false);
    }
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

        {/* FILTROS RETRÁTEIS */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 transition-all">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Filtros de Pesquisa
              </span>
              {temFiltroAtivo && (
                <span className="w-2 h-2 rounded-full bg-[#09797a]" />
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
              >
                {filtrosExpandidos ? '−' : '+'}
              </button>
            </div>
          </div>

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
            <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase">Carregando...</div>
          ) : itens.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
              Nenhum registro encontrado.
            </div>
          ) : (
            itens.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
              >
                <div className="min-w-0 flex-1">
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

                  <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase mt-1 leading-snug">
                    {item.descricao_produto}
                  </h3>

                  <div className="text-[11px] text-slate-500 font-semibold mt-1">
                    QTD: <strong className="text-slate-800">{item.quantidade} {item.unidade_medida}</strong>
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium mt-1">
                    Resp: <strong className="text-slate-600">{item.usuario_nome}</strong>, em{' '}
                    <strong>{formatarDataSegura(item.data_registro)}</strong>, às{' '}
                    <strong>{item.hora_registro?.slice(0, 8)}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-sm sm:text-base font-black text-emerald-800 font-mono">
                    R$ {item.valor_total_item.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setItemEmEdicao(item);
                      setNovaQtd(item.quantidade);
                      setNovoLocal(item.local);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-[#09797a] hover:text-white text-slate-700 font-black text-xs rounded-xl uppercase transition-all shadow-sm active:scale-95"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* MODAL DE EDIÇÃO DE ITEM */}
      {itemEmEdicao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-[#09797a] uppercase">Editar Registro de Consumo</h3>
              <button
                type="button"
                onClick={() => setItemEmEdicao(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl uppercase">
              {itemEmEdicao.descricao_produto}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Quantidade ({itemEmEdicao.unidade_medida})</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={novaQtd}
                  onChange={(e) => setNovaQtd(Number(e.target.value))}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 outline-none focus:border-[#09797a]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Local</label>
                <select
                  value={novoLocal}
                  onChange={(e) => setNovoLocal(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  {LOCAIS_FILTRO.filter((l) => l !== 'Todos').map((l) => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemEmEdicao(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoEdicao || novaQtd <= 0}
                onClick={handleSalvarEdicao}
                className="flex-2 py-2.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-md transition-all disabled:opacity-40"
              >
                {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}