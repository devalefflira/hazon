// src/pages/Vencimentos/components/AbaRelatorios.tsx
import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import type {
  CicloVencimento,
  ProdutoVencimento,
  StatusCicloVencimento,
  TipoAcaoVencimento,
  VencimentoItem
} from '../services/vencimentosService';
import {
  TIPOS_ACAO,
  dataLocalISO,
  dentroDoPeriodo,
  formatarDataBR,
  montarOpcoesHierarquia,
  produtoAtendeHierarquia,
  FILTROS_PADRAO
} from '../utils/vencimentosUtils';
import type { StatusAcaoFiltro } from '../utils/vencimentosUtils';
import {
  abrirPreviewRelatorio,
  exportarRelatorioPdf,
  montarRelatorioCiclos,
  montarRelatorioPosicao
} from '../utils/relatorioVencimentos';
import type { DadosRelatorio } from '../utils/relatorioVencimentos';

type TipoRelatorio = 'ACOES' | 'POSICAO';
type BaseData = 'INICIO' | 'FINALIZACAO' | 'VENCIMENTO';
type Faixa = 'TODAS' | 'VENCIDOS' | 'CRITICO' | 'ALERTA' | 'NORMAL';

interface AbaRelatoriosProps {
  itensAtivos: VencimentoItem[];
  ciclos: CicloVencimento[];
  cicloPorChave: Record<string, CicloVencimento | undefined>;
  chave: (item: VencimentoItem) => string;
  onAviso: (mensagem: string, tipo?: 'sucesso' | 'erro' | 'aviso' | 'info') => void;
}

const classeCampo =
  'w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#09797a]/30 focus:border-[#09797a]';
const classeRotulo = 'text-[10px] font-bold text-gray-500 uppercase px-1';

function Chips<T extends string>({
  valor,
  opcoes,
  onChange
}: {
  valor: T;
  opcoes: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {opcoes.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
            valor === v ? 'bg-[#09797a] text-white border-[#09797a]' : 'bg-white text-gray-500 border-gray-200'
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}

const ROTULO_FAIXA: Record<Faixa, string> = {
  TODAS: 'Todas',
  VENCIDOS: 'Vencidos',
  CRITICO: '≤ 30 dias',
  ALERTA: '31 a 45 dias',
  NORMAL: '≥ 46 dias'
};

const ROTULO_BASE: Record<BaseData, string> = {
  INICIO: 'Início do ciclo',
  FINALIZACAO: 'Finalização',
  VENCIMENTO: 'Vencimento'
};

export default function AbaRelatorios({ itensAtivos, ciclos, cicloPorChave, chave, onAviso }: AbaRelatoriosProps) {
  const [tipo, setTipo] = useState<TipoRelatorio>('ACOES');
  const [baseData, setBaseData] = useState<BaseData>('INICIO');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [secao, setSecao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [statusCiclo, setStatusCiclo] = useState<StatusCicloVencimento | 'TODOS'>('TODOS');
  const [tipoAcao, setTipoAcao] = useState<TipoAcaoVencimento | 'TODOS'>('TODOS');
  const [statusAcao, setStatusAcao] = useState<StatusAcaoFiltro>('TODOS');
  const [faixa, setFaixa] = useState<Faixa>('TODAS');
  const [incluirHistorico, setIncluirHistorico] = useState(true);

  const hierarquia = useMemo(
    () => ({ ...FILTROS_PADRAO, departamento, secao, categoria }),
    [departamento, secao, categoria]
  );

  const opcoes = useMemo(() => {
    const produtos: (ProdutoVencimento | undefined)[] =
      tipo === 'ACOES' ? ciclos.map((c) => c.produtos) : itensAtivos.map((i) => i.produtos);
    return montarOpcoesHierarquia(produtos, departamento, secao);
  }, [tipo, ciclos, itensAtivos, departamento, secao]);

  const ciclosFiltrados = useMemo(() => {
    return ciclos.filter((c) => {
      if (statusCiclo !== 'TODOS' && c.status !== statusCiclo) return false;
      if (tipoAcao !== 'TODOS' && !c.acoes.some((a) => a.tipo === tipoAcao)) return false;
      if (!produtoAtendeHierarquia(c.produtos, hierarquia)) return false;
      if (dataInicio || dataFim) {
        const ref =
          baseData === 'INICIO' ? dataLocalISO(c.iniciado_em)
          : baseData === 'FINALIZACAO' ? dataLocalISO(c.finalizado_em)
          : c.data_validade;
        if (!dentroDoPeriodo(ref, dataInicio, dataFim)) return false;
      }
      return true;
    });
  }, [ciclos, statusCiclo, tipoAcao, hierarquia, baseData, dataInicio, dataFim]);

  const itensFiltrados = useMemo(() => {
    return itensAtivos.filter((i) => {
      const d = i.diasParaVencer;
      if (faixa === 'VENCIDOS' && d >= 0) return false;
      if (faixa === 'CRITICO' && (d < 0 || d > 30)) return false;
      if (faixa === 'ALERTA' && (d < 31 || d > 45)) return false;
      if (faixa === 'NORMAL' && d < 46) return false;
      const temAcao = !!cicloPorChave[chave(i)];
      if (statusAcao === 'COM_ACAO' && !temAcao) return false;
      if (statusAcao === 'SEM_ACAO' && temAcao) return false;
      if (!produtoAtendeHierarquia(i.produtos, hierarquia)) return false;
      if (!dentroDoPeriodo(i.data_validade, dataInicio, dataFim)) return false;
      return true;
    });
  }, [itensAtivos, faixa, statusAcao, cicloPorChave, chave, hierarquia, dataInicio, dataFim]);

  const totalRegistros = tipo === 'ACOES' ? ciclosFiltrados.length : itensFiltrados.length;

  const montarTextoFiltros = (): string => {
    const partes: string[] = [];
    const rotuloPeriodo = tipo === 'ACOES' ? ROTULO_BASE[baseData] : 'Vencimento';
    partes.push(
      dataInicio || dataFim
        ? `${rotuloPeriodo}: ${dataInicio ? formatarDataBR(dataInicio) : 'início'} até ${dataFim ? formatarDataBR(dataFim) : 'hoje'}`
        : `${rotuloPeriodo}: todo o período`
    );
    partes.push(`Departamento: ${departamento || 'Todos'}`);
    partes.push(`Setor: ${secao || 'Todos'}`);
    partes.push(`Categoria: ${categoria || 'Todas'}`);
    if (tipo === 'ACOES') {
      partes.push(`Status: ${statusCiclo === 'TODOS' ? 'Todos' : statusCiclo}`);
      partes.push(`Tipo de ação: ${tipoAcao === 'TODOS' ? 'Todos' : tipoAcao}`);
    } else {
      partes.push(`Faixa: ${ROTULO_FAIXA[faixa]}`);
      partes.push(`Situação: ${statusAcao === 'TODOS' ? 'Todas' : statusAcao === 'COM_ACAO' ? 'Com ação iniciada' : 'Sem ação'}`);
    }
    return partes.join(' • ');
  };

  const montarDados = (): DadosRelatorio | null => {
    if (totalRegistros === 0) {
      onAviso('Nenhum registro encontrado com os filtros selecionados.', 'aviso');
      return null;
    }
    return tipo === 'ACOES'
      ? montarRelatorioCiclos(ciclosFiltrados, montarTextoFiltros(), incluirHistorico)
      : montarRelatorioPosicao(itensFiltrados, cicloPorChave, chave, montarTextoFiltros());
  };

  const handlePreview = () => {
    const dados = montarDados();
    if (!dados) return;
    if (!abrirPreviewRelatorio(dados)) {
      onAviso('O navegador bloqueou a nova aba. Libere pop-ups para o Hazon ou use "Exportar PDF".', 'erro');
    }
  };

  const handleExportar = () => {
    const dados = montarDados();
    if (!dados) return;
    try {
      exportarRelatorioPdf(dados);
    } catch (err) {
      console.error('Erro ao exportar PDF de vencimentos:', err);
      onAviso('Erro ao gerar o PDF.', 'erro');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className={classeRotulo}>Tipo de relatório</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([
            ['ACOES', 'Gestão de Ações', 'Ciclos, desfechos, perdas e recuperação com histórico completo'],
            ['POSICAO', 'Posição de Vencimentos', 'Itens a vencer/vencidos por faixa e situação de ação']
          ] as [TipoRelatorio, string, string][]).map(([valor, titulo, desc]) => (
            <button
              key={valor}
              type="button"
              onClick={() => {
                setTipo(valor);
                setDepartamento('');
                setSecao('');
                setCategoria('');
              }}
              className={`text-left p-3 rounded-2xl border transition-all ${
                tipo === valor ? 'border-[#09797a] bg-teal-50/60 ring-2 ring-[#09797a]/15' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-xs font-black uppercase text-[#09797a] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> {titulo}
              </div>
              <div className="text-[10px] font-bold text-gray-500 mt-0.5 whitespace-normal">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-teal-50/40 border border-teal-100 rounded-2xl p-3.5 flex flex-col gap-2.5">
        {tipo === 'ACOES' && (
          <div className="flex flex-col gap-1">
            <label className={classeRotulo}>Período considerado</label>
            <Chips<BaseData>
              valor={baseData}
              onChange={setBaseData}
              opcoes={[['INICIO', ROTULO_BASE.INICIO], ['FINALIZACAO', ROTULO_BASE.FINALIZACAO], ['VENCIMENTO', ROTULO_BASE.VENCIMENTO]]}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className={classeRotulo}>Data inicial</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={classeCampo} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={classeRotulo}>Data final</label>
            <input type="date" value={dataFim} min={dataInicio || undefined} onChange={(e) => setDataFim(e.target.value)} className={classeCampo} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <label className={classeRotulo}>Departamento</label>
            <select value={departamento} onChange={(e) => { setDepartamento(e.target.value); setSecao(''); setCategoria(''); }} className={classeCampo}>
              <option value="">Todos</option>
              {opcoes.departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={classeRotulo}>Setor</label>
            <select value={secao} onChange={(e) => { setSecao(e.target.value); setCategoria(''); }} className={classeCampo}>
              <option value="">Todos</option>
              {opcoes.secoes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={classeRotulo}>Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={classeCampo}>
              <option value="">Todas</option>
              {opcoes.categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {tipo === 'ACOES' ? (
          <>
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Status do ciclo</label>
              <Chips<StatusCicloVencimento | 'TODOS'>
                valor={statusCiclo}
                onChange={setStatusCiclo}
                opcoes={[['TODOS', 'Todos'], ['Em Curso', 'Em Curso'], ['Finalizado', 'Finalizados']]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Tipo de ação</label>
              <Chips<TipoAcaoVencimento | 'TODOS'>
                valor={tipoAcao}
                onChange={setTipoAcao}
                opcoes={[['TODOS', 'Todos'], ...TIPOS_ACAO.map((t) => [t, t] as [TipoAcaoVencimento, string])]}
              />
            </div>
            <label className="flex items-center gap-2 text-[11px] font-bold text-gray-600 cursor-pointer px-1">
              <input
                type="checkbox"
                checked={incluirHistorico}
                onChange={(e) => setIncluirHistorico(e.target.checked)}
                className="w-4 h-4 accent-[#09797a]"
              />
              Incluir histórico detalhado (data, hora, usuário e detalhe de cada ação)
            </label>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Faixa de vencimento</label>
              <Chips<Faixa>
                valor={faixa}
                onChange={setFaixa}
                opcoes={(Object.keys(ROTULO_FAIXA) as Faixa[]).map((f) => [f, ROTULO_FAIXA[f]] as [Faixa, string])}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={classeRotulo}>Situação</label>
              <Chips<StatusAcaoFiltro>
                valor={statusAcao}
                onChange={setStatusAcao}
                opcoes={[['TODOS', 'Todas'], ['COM_ACAO', 'Com Ação Iniciada'], ['SEM_ACAO', 'Sem Ação']]}
              />
            </div>
          </>
        )}
      </div>

      <div className="text-[11px] font-bold text-gray-500 px-1">
        {totalRegistros} {tipo === 'ACOES' ? 'ciclo(s)' : 'item(ns)'} no relatório
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePreview}
          className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
        >
          Pré-visualizar (nova aba)
        </button>
        <button
          type="button"
          onClick={handleExportar}
          className="flex-1 py-3 bg-white border border-[#09797a] text-[#09797a] rounded-2xl text-xs font-black uppercase active:scale-95 transition-all"
        >
          Exportar PDF
        </button>
      </div>
    </div>
  );
}
