// Arquivo: src/pages/ConfCega/index.tsx
import { useState, useEffect } from 'react';
import { conferenciasService } from './services/conferenciasService';
import FormularConferenciaCega from './components/FormularConferenciaCega';
import { gerarPdfRelatorioConferencia } from './utils/gerarPdfRelatorio';
import { supabase } from '../../lib/supabaseClient';

interface ConfCegaProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

export default function ConfCega({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: ConfCegaProps) {
  const idUsuarioFinal = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;

  const [conferencias, setConferencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'EM_CURSO' | 'CONCLUIDAS'>('EM_CURSO');
  const [conferenciaAtiva, setConferenciaAtiva] = useState<any | null>(null);

  // Modal de Detalhes da Conferência Concluída
  const [conferenciaDetalhes, setConferenciaDetalhes] = useState<any | null>(null);
  const [itensDetalhes, setItensDetalhes] = useState<any[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // Form Novo Recebimento
  const [mostrarNovoManifesto, setMostrarNovoManifesto] = useState(false);
  const [numeroNF, setNumeroNF] = useState('');
  const [dataEmissaoNF, setDataEmissaoNF] = useState(new Date().toISOString().split('T')[0]);
  const [termoBuscaFornecedor, setTermoBuscaFornecedor] = useState('');
  const [fornecedoresEncontrados, setFornecedoresEncontrados] = useState<any[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<any | null>(null);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);
      const dados = await conferenciasService.listarConferencias();
      setConferencias(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // Autocomplete de Fornecedores
  useEffect(() => {
    if (!termoBuscaFornecedor.trim() || fornecedorSelecionado) {
      setFornecedoresEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('fornecedores')
          .select('id, razao_social, nome_fantasia, cnpj')
          .or(`nome_fantasia.ilike.%${termoBuscaFornecedor}%,razao_social.ilike.%${termoBuscaFornecedor}%,cnpj.ilike.%${termoBuscaFornecedor}%`)
          .limit(10);

        if (!error && data) setFornecedoresEncontrados(data);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBuscaFornecedor, fornecedorSelecionado]);

  const handleAbrirDetalhes = async (conf: any) => {
    try {
      setConferenciaDetalhes(conf);
      setCarregandoDetalhes(true);
      const itens = await conferenciasService.listarItensConferidos(conf.id);
      setItensDetalhes(itens);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar itens da conferência.');
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const handleCriarManifesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroNF.trim()) {
      alert('Informe o número da Nota Fiscal.');
      return;
    }

    try {
      setSalvando(true);
      const nova = await conferenciasService.criarConferencia({
        usuario_id: idUsuarioFinal,
        numero_nota_fiscal: numeroNF.trim(),
        data_emissao_nota: dataEmissaoNF,
        fornecedor_id: fornecedorSelecionado?.id || null,
        observacao: observacao.trim()
      });

      setMostrarNovoManifesto(false);
      setNumeroNF('');
      setFornecedorSelecionado(null);
      setTermoBuscaFornecedor('');
      setObservacao('');
      setConferenciaAtiva(nova);
      carregarDadosIniciais();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar manifesto de conferência.');
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelarPelaLista = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja cancelar este lote de conferência?')) return;
    try {
      await conferenciasService.atualizarStatusConferencia(id, 'Cancelada');
      carregarDadosIniciais();
    } catch (err) {
      alert('Erro ao cancelar lote.');
    }
  };

  if (conferenciaAtiva) {
    return (
      <FormularConferenciaCega
        conferencia={conferenciaAtiva}
        onVoltar={() => {
          setConferenciaAtiva(null);
          carregarDadosIniciais();
        }}
        usuarioLogado={usuarioLogado}
      />
    );
  }

  const conferenciasEmCurso = conferencias.filter((c) => c.status === 'Em Andamento' || c.status === 'Pausada' || c.status === 'EM_ANDAMENTO');
  const conferenciasConcluidas = conferencias.filter((c) => c.status === 'Concluida' || c.status === 'CONCLUIDA');

  const listaExibida = abaAtiva === 'EM_CURSO' ? conferenciasEmCurso : conferenciasConcluidas;

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">CONF. CEGA</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Recebimento e Manifesto de NF</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMostrarNovoManifesto(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Receber
          </button>
        </div>

        {/* ABAS */}
        <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('EM_CURSO')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'EM_CURSO' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            EM CURSO ({conferenciasEmCurso.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('CONCLUIDAS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'CONCLUIDAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            CONCLUÍDAS ({conferenciasConcluidas.length})
          </button>
        </div>

        {/* FORM NOVO RECEBIMENTO */}
        {mostrarNovoManifesto && (
          <form onSubmit={handleCriarManifesto} className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-3xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-emerald-200/50 pb-2">
              <span className="text-[10px] font-black text-emerald-800 uppercase">Novo Manifesto de Recebimento</span>
              <button type="button" onClick={() => setMostrarNovoManifesto(false)} className="text-gray-400 font-bold text-xs">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Número da NF</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 4565"
                  value={numeroNF}
                  onChange={(e) => setNumeroNF(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Data Emissão NF</label>
                <input
                  type="date"
                  required
                  value={dataEmissaoNF}
                  onChange={(e) => setDataEmissaoNF(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                />
              </div>
            </div>

            {/* FORNECEDOR */}
            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Selecione o Fornecedor Emissor</label>
              <input
                type="text"
                value={termoBuscaFornecedor}
                onChange={(e) => {
                  setTermoBuscaFornecedor(e.target.value);
                  setFornecedorSelecionado(null);
                }}
                placeholder="Digite para buscar fornecedor..."
                className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />

              {fornecedoresEncontrados.length > 0 && !fornecedorSelecionado && (
                <div className="absolute top-15 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-gray-100">
                  {fornecedoresEncontrados.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFornecedorSelecionado(f);
                        setTermoBuscaFornecedor(f.nome_fantasia || f.razao_social);
                        setFornecedoresEncontrados([]);
                      }}
                      className="w-full text-left p-3 hover:bg-emerald-50/50 flex flex-col text-xs font-bold text-gray-800 uppercase"
                    >
                      <span>{f.nome_fantasia || f.razao_social}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-3 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              {salvando ? 'Iniciando...' : 'Confirmar e Abrir Coleta'}
            </button>
          </form>
        )}

        {/* LISTAGEM DE LOTES (CAPA DETALHADA PARA CONCLUÍDAS) */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando lotes...</div>
          ) : listaExibida.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhuma nota fiscal registrada nesta etapa.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {listaExibida.map((item) => {
                const fornecedorNome = item.fornecedores 
                  ? (item.fornecedores.nome_fantasia || item.fornecedores.razao_social) 
                  : 'N/A';
                const usuarioNome = item.usuarios?.nome || 'SISTEMA';

                const dataFormatada = item.data_conferencia 
                  ? new Date(item.data_conferencia + 'T00:00:00').toLocaleDateString('pt-BR')
                  : new Date(item.created_at).toLocaleDateString('pt-BR');

                const horaFormatada = item.hora_conferencia || new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (abaAtiva === 'EM_CURSO') setConferenciaAtiva(item);
                      else handleAbrirDetalhes(item);
                    }}
                    className="p-3.5 bg-gray-50 hover:bg-emerald-50/40 border border-gray-200 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex flex-col gap-1 w-full pr-2">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded-md uppercase">
                          Manifesto: {item.codigo_customizado}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-gray-400">
                          {dataFormatada} às {horaFormatada}
                        </span>
                      </div>

                      <div className="flex justify-between items-end mt-1">
                        <div>
                          <h4 className="font-black text-xs text-gray-800 uppercase">
                            NF: {item.numero_nota_fiscal || 'SEM NF'}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-bold uppercase truncate max-w-[280px]">
                            Forn: {fornecedorNome}
                          </p>
                          <span className="text-[9px] text-gray-400 font-medium block">
                            Usuário: <strong className="text-gray-600">{usuarioNome}</strong>
                          </span>
                        </div>

                        {abaAtiva === 'EM_CURSO' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleCancelarPelaLista(item.id, e)}
                              className="px-2.5 py-1.5 text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 rounded-xl uppercase"
                            >
                              Cancelar
                            </button>
                            <button type="button" className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded-xl text-xs font-black uppercase">
                              Bipar
                            </button>
                          </div>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-[10px] font-black uppercase">
                            Ver Itens
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE DETALHES E EXPORTAÇÃO DE RELATÓRIO PDF */}
      {conferenciaDetalhes && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase">Resumo da Conferência Concluída</span>
                <h3 className="text-[#09797a] font-black text-base uppercase">{conferenciaDetalhes.codigo_customizado}</h3>
              </div>
              <button type="button" onClick={() => setConferenciaDetalhes(null)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl grid grid-cols-2 gap-2 text-xs font-bold">
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Número da NF</span>
                <span className="text-gray-800">{conferenciaDetalhes.numero_nota_fiscal || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Conferente</span>
                <span className="text-gray-800">{conferenciaDetalhes.usuarios?.nome || 'SISTEMA'}</span>
              </div>
              <div className="col-span-2 border-t border-gray-200 pt-1">
                <span className="text-[9px] font-black text-gray-400 block uppercase">Fornecedor</span>
                <span className="text-gray-800 uppercase">
                  {conferenciaDetalhes.fornecedores?.nome_fantasia || conferenciaDetalhes.fornecedores?.razao_social || 'NÃO INFORMADO'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 max-h-[40vh]">
              <span className="text-[10px] font-black text-gray-400 uppercase px-1">Itens Conferidos ({itensDetalhes.length})</span>
              
              {carregandoDetalhes ? (
                <div className="text-center py-6 text-xs font-bold text-gray-400 uppercase">Buscando itens...</div>
              ) : itensDetalhes.map((item) => {
                const prod = item.produtos || {};
                return (
                  <div key={item.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-xs text-gray-800 uppercase">{prod.descricao || 'PRODUTO NÃO ENCONTRADO'}</h4>
                      <p className="text-[10px] font-mono text-gray-400">Cód: {prod.codprod} | EAN: {prod.codbarra || 'N/A'}</p>
                    </div>
                    <div className="text-right font-mono font-black text-xs text-[#09797a] bg-emerald-100 px-2 py-1 rounded-lg">
                      {item.quantidade_contada} {item.unidade_medida || prod.unidade || 'UN'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConferenciaDetalhes(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => gerarPdfRelatorioConferencia(conferenciaDetalhes, itensDetalhes)}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all"
              >
                🖨️ Exportar Relatório PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}