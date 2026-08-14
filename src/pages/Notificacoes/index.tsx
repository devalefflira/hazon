// Arquivo: src/pages/Notificacoes/index.tsx
import { useState, useEffect } from 'react';
import { vencimentosService } from '../Vencimentos/services/vencimentosService';
import type { VencimentoItem } from '../Vencimentos/services/vencimentosService';

interface NotificacoesProps {
  onVoltarParaHome: () => void;
  onNavegarParaVencimentos: () => void;
  usuarioLogado?: any;
}

const FAIXAS_DIAS = [10, 15, 20, 30, 45, 60, 90];

export default function Notificacoes({
  onVoltarParaHome,
  onNavegarParaVencimentos,
  usuarioLogado
}: NotificacoesProps) {
  const [abaAtiva, setAbaAtiva] = useState<'VENCIMENTOS' | 'OUTRAS'>('VENCIMENTOS');
  const [faixaFiltro, setFaixaFiltro] = useState<number | 'TODAS'>('TODAS');
  const [itens, setItens] = useState<VencimentoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const idUser = usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;
      const res = await vencimentosService.listarTodosVencimentos(idUser);
      // Filtra apenas produtos a vencer em até 90 dias
      setItens(res.filter((i: VencimentoItem) => i.diasParaVencer >= 0 && i.diasParaVencer <= 90));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [usuarioLogado]);

  // Ação ao clicar em "Ver"
  const handleVerNotificacao = async (item: VencimentoItem) => {
    const idUser = usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;
    if (idUser && item.id) {
      await vencimentosService.marcarComoVisto(item.id, idUser);
    }
    onNavegarParaVencimentos();
  };

  const itensFiltrados = faixaFiltro === 'TODAS'
    ? itens
    : itens.filter((i: VencimentoItem) => i.diasParaVencer <= faixaFiltro);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">NOTIFICAÇÕES</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Central de Alertas e Pendências</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavegarParaVencimentos}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-3.5 py-2 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            Ver Vencimentos
          </button>
        </div>

        {/* ABAS */}
        <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('VENCIMENTOS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${
              abaAtiva === 'VENCIMENTOS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'
            }`}
          >
            Vencimentos ({itens.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('OUTRAS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${
              abaAtiva === 'OUTRAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'
            }`}
          >
            Outras Notificações
          </button>
        </div>

        {abaAtiva === 'VENCIMENTOS' ? (
          <div className="flex-1 flex flex-col gap-3">
            {/* SELETOR DE CRITÉRIOS DE DIAS */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setFaixaFiltro('TODAS')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${
                  faixaFiltro === 'TODAS' ? 'bg-[#09797a] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Todas (≤ 90d)
              </button>
              {FAIXAS_DIAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFaixaFiltro(d)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${
                    faixaFiltro === d ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  ≤ {d} Dias
                </button>
              ))}
            </div>

            {/* LISTAGEM DAS NOTIFICAÇÕES */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {loading ? (
                <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Verificando notificações...</div>
              ) : itensFiltrados.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                  Nenhuma notificação de vencimento para a faixa selecionada.
                </div>
              ) : (
                itensFiltrados.map((item: VencimentoItem) => {
                  const prod: any = item.produtos || {};
                  const dataValFmt = new Date(item.data_validade + 'T00:00:00').toLocaleDateString('pt-BR');
                  const isVisto = item.statusLeitura === 'Visto';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 border rounded-2xl flex justify-between items-center transition-all ${
                        isVisto
                          ? 'bg-gray-50 border-gray-200 opacity-75'
                          : 'bg-red-50/70 border-red-200 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded uppercase ${
                            isVisto ? 'bg-gray-200 text-gray-600' : 'bg-red-600 text-white'
                          }`}>
                            {isVisto ? '✓ Visto' : '● Pendente'}
                          </span>
                          <span className="text-[9px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase">
                            Vence em {item.diasParaVencer} dias
                          </span>
                          <span className="text-[10px] font-mono font-bold text-gray-400">
                            Cód: {prod.codprod}
                          </span>
                        </div>

                        <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                          {prod.descricao}
                        </h4>

                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                          Lote: {item.lote} | Qtd: {item.quantidade} | Validade: {dataValFmt}
                        </p>

                        {isVisto && item.visualizadoEm && (
                          <span className="text-[9px] font-mono text-gray-400 block mt-1">
                            Visto por {item.visualizadoPor || 'Usuário'} em {item.visualizadoEm}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVerNotificacao(item)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 transition-all ${
                          isVisto
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-[#09797a] hover:bg-[#075f60] text-white'
                        }`}
                      >
                        Ver
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
            Área de outras notificações em desenvolvimento.
          </div>
        )}

      </div>
    </div>
  );
}