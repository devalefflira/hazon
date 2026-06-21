import { useState, useEffect } from 'react';
import { avariasService } from './services/avariasService';
import type { AvariaRegistroDTO } from './types/avarias.types';
import { RegistrarAvariaModal } from './components/RegistrarAvariaModal';

interface AvariasProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

export default function Avarias({ usuarioLogadoId, onVoltarParaHome }: AvariasProps) {
  const [loading, setLoading] = useState(true);
  const [avarias, setAvarias] = useState<AvariaRegistroDTO[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregarAvarias() {
    try {
      setLoading(true);
      const dados = await avariasService.listarAvarias();
      setAvarias(dados);
    } catch (err) {
      console.error('Erro ao listar histórico de avarias:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarAvarias();
  }, []);

  const getCorDestinacao = (dest: string) => {
    if (dest === 'Descarte') return 'bg-red-50 text-red-700 border-red-100';
    if (dest === 'Uso Interno') return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-purple-50 text-purple-700 border-purple-100';
  };

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

        {/* FEED HISTÓRICO DE OCORRÊNCIAS */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-170px)] pb-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-center text-gray-400 text-xs font-bold py-10">Mapeando livro de perdas...</p>
          ) : avarias.length === 0 ? (
            <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhuma avaria registrada no depósito.</p>
          ) : (
            avarias.map((avaria) => (
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