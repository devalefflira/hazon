// Arquivo: src/pages/Avarias/index.tsx
import { useState, useEffect } from 'react';
import { avariasService } from './services/avariasService';
import RegistrarAvariaModal from './components/RegistrarAvariaModal';

interface AvariasProps {
  onVoltarParaHome: () => void;
  usuarioLogadoId?: string;
}

export default function Avarias({ onVoltarParaHome, usuarioLogadoId }: AvariasProps) {
  const [avarias, setAvarias] = useState<any[]>([]);
  const [motivos, setMotivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  // Filtros
  const [motivoFiltro, setMotivoFiltro] = useState('');
  const [destinacaoFiltro, setDestinacaoFiltro] = useState('');

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [dadosAvarias, dadosMotivos] = await Promise.all([
        avariasService.listarAvarias({
          motivo_id: motivoFiltro || undefined,
          destinacao: destinacaoFiltro || undefined
        }),
        avariasService.listarMotivosAvaria()
      ]);
      setAvarias(dadosAvarias);
      setMotivos(dadosMotivos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [motivoFiltro, destinacaoFiltro]);

  const handleSalvarAvaria = async (payload: any) => {
    try {
      const idUsuarioFinal = usuarioLogadoId || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;
      await avariasService.registrarAvaria({
        ...payload,
        usuario_id: idUsuarioFinal
      });
      alert('Avaria registrada com sucesso!');
      setModalAberto(false);
      carregarDados();
    } catch (err) {
      alert('Erro ao registrar avaria.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">AVARIAS</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Controle de Quebras e Perdas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Registrar
          </button>
        </div>

        {/* FILTROS AVANÇADOS */}
        <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">Filtros Avançados</span>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={motivoFiltro}
              onChange={(e) => setMotivoFiltro(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
            >
              <option value="">⚠️ Motivo: Todos</option>
              {motivos.map((m) => (
                <option key={m.id} value={m.id}>{m.descricao.toUpperCase()}</option>
              ))}
            </select>

            <select
              value={destinacaoFiltro}
              onChange={(e) => setDestinacaoFiltro(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
            >
              <option value="">📦 Destinação: Todas</option>
              <option value="Descarte">Descarte</option>
              <option value="Troca Fornecedor">Troca Fornecedor</option>
              <option value="Consumo Interno">Consumo Interno</option>
              <option value="Doação">Doação</option>
            </select>
          </div>
        </div>

        {/* LISTAGEM DE AVARIAS */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando avarias...</div>
          ) : avarias.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhuma avaria encontrada com os filtros selecionados.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {avarias.map((item) => {
                const prod = item.produtos || {};
                const motivoDesc = item.motivos_falta?.descricao || item.motivos_avaria?.descricao || 'Avaria';
                const respNome = item.usuarios?.nome || 'SISTEMA';

                const dataFmt = item.data_registro
                  ? new Date(item.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')
                  : new Date(item.created_at).toLocaleDateString('pt-BR');

                const totalPerda = Number(item.quantidade || 0) * Number(item.preco_custo_na_perda || 0);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-md uppercase">
                          {item.codigo_customizado}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-400">
                          Cód: {prod.codprod || 'N/A'}
                        </span>
                      </div>

                      <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                        {prod.descricao || 'PRODUTO NÃO ENCONTRADO'}
                      </h4>

                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                        Qtd: <strong className="text-gray-800">{item.quantidade} {item.produtos?.unidade || 'UN'}</strong> | Motivo: {motivoDesc}
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono font-bold text-gray-600 bg-gray-200/60 px-2 py-0.5 rounded uppercase">
                          Destino: {item.destinacao}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-gray-400">
                          Resp: <strong className="text-gray-700">{respNome}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-xs text-red-600 block">
                        - {totalPerda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-gray-400 block mt-1">
                        {dataFmt} {item.hora_registro ? `às ${item.hora_registro}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE REGISTRO DE AVARIA */}
      {modalAberto && (
        <RegistrarAvariaModal
          motivos={motivos}
          onSalvar={handleSalvarAvaria}
          onCancelar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}