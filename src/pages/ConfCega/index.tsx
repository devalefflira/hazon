// Arquivo: src/pages/ConfCega/index.tsx
import { useState, useEffect } from 'react';
import { conferenciasService } from './services/conferenciasService';
import FormularConferenciaCega from './components/FormularConferenciaCega';
import { gerarPdfRelatorio } from './utils/gerarPdfRelatorio';
import type { ConferenciaMestre } from './types/conferencias.types';

interface ConfCegaProps {
  onVoltarParaHome: () => void;
  usuarioLogadoId?: string;
}

export default function ConfCega({ onVoltarParaHome, usuarioLogadoId }: ConfCegaProps) {
  const [conferencias, setConferencias] = useState<ConferenciaMestre[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [conferenciaAtiva, setConferenciaAtiva] = useState<ConferenciaMestre | null>(null);

  // Modal Nova Conferência
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [fornecedorId, setFornecedorId] = useState('');
  const [termoBuscaForn, setTermoBuscaForn] = useState('');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<any | null>(null);

  const [numeroNota, setNumeroNota] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [criando, setCriando] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [dadosConf, dadosForn] = await Promise.all([
        conferenciasService.listarConferencias(),
        conferenciasService.listarFornecedores()
      ]);
      setConferencias(dadosConf);
      setFornecedores(dadosForn);
    } catch (err) {
      console.error('Erro ao listar conferências/fornecedores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriarNovaConferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    const idUser = usuarioLogadoId || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;
    if (!idUser) {
      alert('Usuário não autenticado.');
      return;
    }

    try {
      setCriando(true);
      const nova = await conferenciasService.criarConferencia({
        usuario_id: idUser,
        fornecedor_id: fornecedorId || undefined,
        numero_nota_fiscal: numeroNota.trim() || undefined,
        data_emissao_nota: dataEmissao || undefined,
        observacao: observacao.trim() || undefined
      });

      setModalNovoAberto(false);
      setFornecedorId('');
      setTermoBuscaForn('');
      setFornecedorSelecionado(null);
      setNumeroNota('');
      setDataEmissao('');
      setObservacao('');
      setConferenciaAtiva(nova);
      carregarDados();
    } catch (err) {
      alert('Erro ao iniciar lote de conferência.');
    } finally {
      setCriando(false);
    }
  };

  const handleCancelarConferencia = async (id: string) => {
    if (!confirm('Deseja cancelar esta conferência?')) return;
    try {
      await conferenciasService.atualizarStatusConferencia(id, 'Cancelada');
      carregarDados();
    } catch (err) {
      alert('Erro ao cancelar conferência.');
    }
  };

  const handleExportarPdf = async (conf: ConferenciaMestre) => {
    try {
      const itens = await conferenciasService.listarItensConferidos(conf.id);
      gerarPdfRelatorio(conf, itens);
    } catch (err) {
      alert('Erro ao gerar relatório da conferência.');
    }
  };

  // Se uma conferência estiver ativa em modo de bipe/digitação
  if (conferenciaAtiva) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
        <FormularConferenciaCega
          conferencia={conferenciaAtiva}
          conferenciaId={conferenciaAtiva.id}
          codigoLote={conferenciaAtiva.codigo_customizado}
          onVoltar={() => {
            setConferenciaAtiva(null);
            carregarDados();
          }}
          onFinalizarOuPausar={() => {
            setConferenciaAtiva(null);
            carregarDados();
          }}
          onCancelar={() => {
            setConferenciaAtiva(null);
            carregarDados();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">CONF. CEGA</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Conferência de Recebimento de Mercadorias</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFornecedorId('');
              setTermoBuscaForn('');
              setFornecedorSelecionado(null);
              setNumeroNota('');
              setDataEmissao('');
              setObservacao('');
              setModalNovoAberto(true);
            }}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Iniciar Lote
          </button>
        </div>

        {/* LISTAGEM DE LOTES */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando conferências...</div>
          ) : conferencias.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhuma conferência encontrada. Clique em "+ Iniciar Lote" para começar.
            </div>
          ) : (
            conferencias.map((conf) => {
              const isEmAndamento = conf.status === 'Em Andamento';
              const isFinalizado = conf.status === 'Finalizado';
              const nomeForn = conf.fornecedores?.nome_fantasia || conf.fornecedores?.razao_social;

              return (
                <div
                  key={conf.id}
                  className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">
                        {conf.codigo_customizado}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        isEmAndamento ? 'bg-amber-100 text-amber-800' :
                        isFinalizado ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {conf.status}
                      </span>
                      {nomeForn && (
                        <span className="text-[9px] font-black text-gray-600 bg-gray-200 px-2 py-0.5 rounded uppercase truncate max-w-[150px]">
                          {nomeForn}
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                      NF: {conf.numero_nota_fiscal || 'S/N'} | Itens: {conf.conferencia_itens?.length || 0}
                    </h4>

                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Resp: {conf.usuarios?.nome || 'SISTEMA'} - {conf.data_conferencia} às {conf.hora_conferencia}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEmAndamento && (
                      <>
                        <button
                          type="button"
                          onClick={() => setConferenciaAtiva(conf)}
                          className="px-3 py-1.5 bg-[#09797a] text-white rounded-xl text-xs font-black uppercase shadow-xs"
                        >
                          Continuar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelarConferencia(conf.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold"
                          title="Cancelar Conferência"
                        >
                          ✕
                        </button>
                      </>
                    )}

                    {isFinalizado && (
                      <button
                        type="button"
                        onClick={() => handleExportarPdf(conf)}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-black uppercase transition-all shadow-xs"
                      >
                        🖨️ PDF
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* MODAL INICIAR NOVO LOTE COM BUSCA DE FORNECEDOR */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <form onSubmit={handleCriarNovaConferencia} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">INICIAR LOTE DE CONFERÊNCIA</h3>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="text-gray-400 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* BUSCA DE FORNECEDOR POR DIGITAÇÃO */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Fornecedor (Opcional)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite a razão social ou nome fantasia..."
                    value={termoBuscaForn}
                    onChange={(e) => {
                      setTermoBuscaForn(e.target.value);
                      setFornecedorSelecionado(null);
                      setFornecedorId('');
                    }}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase pr-8"
                  />
                  {fornecedorSelecionado && (
                    <button
                      type="button"
                      onClick={() => {
                        setFornecedorSelecionado(null);
                        setTermoBuscaForn('');
                        setFornecedorId('');
                      }}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-red-500 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* LISTA SUSPENSA COM RESULTADOS */}
                {termoBuscaForn.trim() && !fornecedorSelecionado && (
                  <div className="absolute top-15 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-44 overflow-y-auto z-30 divide-y divide-gray-100">
                    {fornecedores
                      .filter((f) => {
                        const termo = termoBuscaForn.toLowerCase();
                        const fantasia = (f.nome_fantasia || '').toLowerCase();
                        const razao = (f.razao_social || '').toLowerCase();
                        return fantasia.includes(termo) || razao.includes(termo);
                      })
                      .slice(0, 8)
                      .map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setFornecedorSelecionado(f);
                            setFornecedorId(f.id);
                            setTermoBuscaForn(f.nome_fantasia || f.razao_social);
                          }}
                          className="w-full text-left p-2.5 hover:bg-emerald-50 text-xs font-bold text-gray-800 uppercase flex flex-col"
                        >
                          <span>{f.nome_fantasia || f.razao_social}</span>
                          {f.nome_fantasia && f.razao_social && (
                            <span className="text-[9px] text-gray-400">{f.razao_social}</span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Número NF</label>
                  <input
                    type="text"
                    placeholder="Ex: 123456"
                    value={numeroNota}
                    onChange={(e) => setNumeroNota(e.target.value)}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Emissão NF</label>
                  <input
                    type="date"
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Observação</label>
                <input
                  type="text"
                  placeholder="Ex: Carga descarregada na Doca 02"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criando}
                className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                {criando ? 'Iniciando...' : 'Iniciar Bipe'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}