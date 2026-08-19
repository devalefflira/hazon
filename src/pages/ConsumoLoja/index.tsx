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
      <div className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
        
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

        {/* FILTROS */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Filtros de Pesquisa
            </span>
            {(dataInicio || dataFim || departamento !== 'TODOS' || local !== 'Todos') && (
              <button
                type="button"
                onClick={() => {
                  setDataInicio('');
                  setDataFim('');
                  setDepartamento('TODOS');
                  setLocal('Todos');
                }}
                className="text-[10px] font-bold text-red-600 hover:underline uppercase"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
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
        </div>

        {/* CAMPO: VALOR TOTAL */}
        <div className="bg-emerald-50/70 border border-emerald-200 px-4 py-3 rounded-2xl flex justify-between items-center">
          <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
            Valor Total do Consumo no Período:
          </span>
          <span className="font-mono text-base sm:text-lg font-black text-emerald-800">
            {valorTotalSoma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        {/* TABELA DE LISTAGEM */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs font-bold border-collapse">
            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left">Descrição Produto</th>
                <th className="p-3 text-center">Local</th>
                <th className="p-3 text-center">Departamento</th>
                <th className="p-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-400 uppercase">Carregando registros...</td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-400 italic font-medium">
                    Nenhum item de consumo registrado para este filtro.
                  </td>
                </tr>
              ) : (
                itens.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3">
                      <span className="text-slate-800 uppercase block font-black leading-tight">
                        {item.descricao_produto}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        Qtd: {item.quantidade} • Data: {formatarDataSegura(item.data_registro)}
                      </span>
                    </td>
                    <td className="p-3 text-center uppercase text-slate-600 font-semibold">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                        {item.local}
                      </span>
                    </td>
                    <td className="p-3 text-center uppercase text-slate-500 font-semibold">
                      {item.departamento}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-800 text-xs sm:text-sm">
                      {item.valor_total_item.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}