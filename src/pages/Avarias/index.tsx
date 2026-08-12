// Arquivo: src/pages/Avarias/index.tsx
import { useState, useEffect } from 'react';
import { avariasService, type AvariaRegistro } from './services/avariasService';
import { RegistrarAvariaModal } from './components/RegistrarAvariaModal';

interface AvariasProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

export default function Avarias({ onVoltarParaHome, usuarioLogado }: AvariasProps) {
  const [avarias, setAvarias] = useState<AvariaRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberta, setModalAberta] = useState(false);

  // Filtros
  const [motivos, setMotivos] = useState<any[]>([]);
  const [motivoId, setMotivoId] = useState('TODOS');
  const [destinacao, setDestinacao] = useState('TODAS');

  const carregarAvarias = async () => {
    try {
      setLoading(true);
      const dados = await avariasService.listarAvarias({
        motivoId,
        destinacao
      });
      setAvarias(dados);
    } catch (err) {
      console.error('Erro ao carregar avarias:', err);
    } finally {
      setLoading(false);
    }
  };

  const carregarMotivos = async () => {
    try {
      const dados = await avariasService.listarMotivosAvaria();
      setMotivos(dados);
    } catch (err) {
      console.error('Erro ao carregar motivos:', err);
    }
  };

  useEffect(() => {
    carregarMotivos();
  }, []);

  useEffect(() => {
    carregarAvarias();
  }, [motivoId, destinacao]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Avarias</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Controle de Quebras e Perdas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalAberta(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Registrar
          </button>
        </div>

        {/* FILTROS AVANÇADOS */}
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-3xl flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">Filtros Avançados</span>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={motivoId}
              onChange={(e) => setMotivoId(e.target.value)}
              className="h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-700"
            >
              <option value="TODOS">⚠️ Motivo: Todos</option>
              {motivos.map((m) => (
                <option key={m.id} value={m.id}>{m.descricao.toUpperCase()}</option>
              ))}
            </select>

            <select
              value={destinacao}
              onChange={(e) => setDestinacao(e.target.value)}
              className="h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-700"
            >
              <option value="TODAS">📦 Destinação: Todas</option>
              <option value="Descarte">Descarte</option>
              <option value="Devolução Fornecedor">Devolução Fornecedor</option>
              <option value="Consumo Interno">Consumo Interno</option>
              <option value="Doação">Doação</option>
            </select>
          </div>
        </div>

        {/* LISTA DE AVARIAS */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Consultando avarias...</div>
          ) : avarias.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhuma avaria encontrada para o filtro selecionado.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {avarias.map((item) => {
                // Tipagem explícita para evitar o erro ts(2339)
                const prod = (item.produtos || {}) as Record<string, any>;
                const custoTotal = (Number(item.quantidade) || 0) * (Number(item.preco_custo_na_perda) || 0);

                return (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-lg">{item.codigo_customizado}</span>
                        <span className="text-[10px] font-mono text-gray-400">Cód: {prod.codprod || 'N/A'}</span>
                      </div>
                      <h4 className="font-black text-xs text-gray-800 uppercase mt-1">{prod.descricao || 'PRODUTO REMOVIDO'}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Qtd: <strong className="text-gray-700">{item.quantidade} {prod.unidade || 'UN'}</strong> | Motivo: {item.motivos_avaria?.descricao || 'N/A'}
                      </p>
                      <span className="inline-block text-[9px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-bold mt-1">
                        Destino: {item.destinacao}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-xs font-black text-red-600 font-mono">
                        - R$ {custoTotal.toFixed(2)}
                      </span>
                      <span className="block text-[9px] font-mono text-gray-400 mt-1">
                        {new Date(item.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {modalAberta && (
        <RegistrarAvariaModal
          onSucesso={carregarAvarias}
          onFechar={() => setModalAberta(false)}
          usuarioLogado={usuarioLogado}
        />
      )}
    </div>
  );
}