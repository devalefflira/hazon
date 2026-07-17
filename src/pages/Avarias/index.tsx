import { useState, useEffect } from 'react';
import { avariasService } from './services/avariasService'; // <-- GARANTA AS CHAVES AQUI
import type { AvariaRegistroDTO, MotivoAvariaDTO } from './types/avarias.types';
import { RegistrarAvariaModal } from './components/RegistrarAvariaModal';

interface AvariasProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

export default function Avarias({ usuarioLogadoId, onVoltarParaHome }: AvariasProps) {
  const [loading, setLoading] = useState(true);
  const [avarias, setAvarias] = useState<AvariaRegistroDTO[]>([]);
  const [motivos, setMotivos] = useState<MotivoAvariaDTO[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  // Estados dos Filtros do Topo
  const [filtroPeriodo, setFiltroPeriodo] = useState<'Todos' | 'Hoje' | 'Esta Semana' | 'Este Mês'>('Todos');
  const [filtroMotivo, setFiltroMotivo] = useState<string>('Todos');
  const [filtroDestinacao, setFiltroDestinacao] = useState<string>('Todos');

  async function inicializarDados() {
    try {
      setLoading(true);
      const [dadosAvarias, dadosMotivos] = await Promise.all([
        avariasService.listarAvarias(),
        avariasService.listarMotivos()
      ]);
      setAvarias(dadosAvarias);
      setMotivos(dadosMotivos);
    } catch (err) {
      console.error('Erro ao inicializar painel de avarias:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    inicializarDados();
  }, []);

  // Lógica de Filtragem Combinada Estrita
  const avariasFiltradas = avarias.filter((avaria) => {
    // 1. Filtro de Período
    if (filtroPeriodo !== 'Todos') {
      const dataAvaria = new Date(avaria.data_registro + 'T00:00:00');
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (filtroPeriodo === 'Hoje') {
        if (avaria.data_registro !== new Date().toISOString().split('T')[0]) return false;
      } else if (filtroPeriodo === 'Esta Semana') {
        const primeiroDiaSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay() + (hoje.getDay() === 0 ? -6 : 1)));
        if (dataAvaria < primeiroDiaSemana) return false;
      } else if (filtroPeriodo === 'Este Mês') {
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        if (dataAvaria < primeiroDiaMes) return false;
      }
    }

    // 2. Filtro de Motivo da Perda (Garantido: motivo_avaria_id)
    if (filtroMotivo !== 'Todos' && avaria.motivo_avaria_id !== filtroMotivo) {
      return false;
    }

    // 3. Filtro de Destinação
    if (filtroDestinacao !== 'Todos' && avaria.destinacao !== filtroDestinacao) {
      return false;
    }

    return true;
  });

  const getCorDestinacao = (dest: string) => {
    if (dest === 'Descarte') return 'bg-red-50 text-red-700 border-red-100';
    if (dest === 'Uso Interno') return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-purple-50 text-purple-700 border-purple-100';
  };

  function carregarAvarias() {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex justify-center items-start">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome}
              className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Avarias</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Controle de Quebras e Perdas</p>
            </div>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="bg-[#09797a] text-white text-xs font-black px-4 py-3 rounded-2xl shadow-md active:scale-95 transition-all"
          >
            + Registrar
          </button>
        </div>

        {/* CONTAINER DE FILTROS SUPERIORES */}
        <div className="flex flex-col gap-2.5 mb-5 bg-gray-50/70 p-3 rounded-3xl border border-gray-100">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Filtros Avançados</span>
          <div className="grid grid-cols-3 gap-2">
            
            {/* FILTRO PERÍODO */}
            <div className="flex flex-col gap-1">
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value as any)}
                className="w-full h-9 bg-white border border-gray-200 rounded-xl px-2 text-[10px] font-bold text-gray-700 focus:outline-none focus:border-[#09797a]"
              >
                <option value="Todos">📅 PERÍODO</option>
                <option value="Hoje">HOJE</option>
                <option value="Esta Semana">ESTA SEMANA</option>
                <option value="Este Mês">ESTE MÊS</option>
              </select>
            </div>

            {/* FILTRO MOTIVO */}
            <div className="flex flex-col gap-1">
              <select
                value={filtroMotivo}
                onChange={(e) => setFiltroMotivo(e.target.value)}
                className="w-full h-9 bg-white border border-gray-200 rounded-xl px-2 text-[10px] font-bold text-gray-700 focus:outline-none focus:border-[#09797a] uppercase truncate"
              >
                <option value="Todos">⚠️ MOTIVO</option>
                {motivos.map(m => (
                  <option key={m.id} value={m.id}>{m.descricao}</option>
                ))}
              </select>
            </div>

            {/* FILTRO DESTINAÇÃO */}
            <div className="flex flex-col gap-1">
              <select
                value={filtroDestinacao}
                onChange={(e) => setFiltroDestinacao(e.target.value)}
                className="w-full h-9 bg-white border border-gray-200 rounded-xl px-2 text-[10px] font-bold text-gray-700 focus:outline-none focus:border-[#09797a]"
              >
                <option value="Todos">📦 DESTINAÇÃO</option>
                <option value="Descarte">DESCARTE</option>
                <option value="Devolução Fornecedor">DEVOLUÇÃO</option>
                <option value="Troca Comercial">TROCA COMERCIAL</option>
                <option value="Uso Interno">USO INTERNO</option>
              </select>
            </div>

          </div>
        </div>

        {/* FEED HISTÓRICO DE OCORRÊNCIAS */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-245px)] pb-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-center text-gray-400 text-xs font-bold py-10">Mapeando livro de perdas...</p>
          ) : avariasFiltradas.length === 0 ? (
            <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhuma avaria encontrada para o filtro selecionado.</p>
          ) : (
            avariasFiltradas.map((avaria) => (
              <div
                key={avaria.id}
                className="border border-gray-200 rounded-3xl p-4 bg-gray-50/40 flex flex-col gap-2 shadow-sm select-text"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="truncate max-w-[70%] flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 font-mono font-black uppercase">{avaria.codigo_customizado}</span>
                    <h3 className="text-xs font-black text-gray-700 truncate uppercase leading-tight">{avaria.produto_descricao}</h3>
                    {avaria.produto_codigo_barras && (
                      <span className="text-[9px] text-gray-400 font-mono">EAN: {avaria.produto_codigo_barras}</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-[#09797a] bg-white border border-gray-100 px-3 py-1 rounded-xl shrink-0 shadow-sm">
                    {avaria.quantidade} {avaria.produto_unidade_medida}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-gray-100/70 pt-2 mt-0.5 text-[10px]">
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-wider text-gray-400">Motivo da perda:</span>
                    {/* Garantido: motivo_avaria_descricao */}
                    <span className="text-gray-600 font-bold uppercase truncate block">{avaria.motivo_avaria_descricao}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-wider text-gray-400">Destinação dada:</span>
                    <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.2 rounded-md border mt-0.5 ${getCorDestinacao(avaria.destinacao)}`}>
                      {avaria.destinacao}
                    </span>
                  </div>
                </div>

                {avaria.observacao && (
                  <div className="mt-1 p-2 bg-white border border-gray-100 rounded-xl text-[10px] text-gray-500 font-medium uppercase leading-snug">
                    📝 Obs: {avaria.observacao}
                  </div>
                )}

                <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold font-mono mt-1 border-t border-gray-50 pt-1.5">
                  <span>👤 Reg: {avaria.usuario_nome}</span>
                  <span>{new Date(avaria.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')} - {avaria.hora_registro.substring(0, 5)}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* MODAL OPERACIONAL DE REGISTRO */}
      {modalAberto && (
        <RegistrarAvariaModal
          usuarioId={usuarioLogadoId}
          onFechar={() => setModalAberto(false)}
          onSucesso={() => {
            setModalAberto(false);
            carregarAvarias();
          }}
        />
      )}
    </div>
  );
}