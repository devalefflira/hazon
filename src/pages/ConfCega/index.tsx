// Arquivo: src/pages/ConfCega/index.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { conferenciasService } from './services/conferenciasService';
import type { ConferenciaMestreDTO } from './types/conferencias.types';
import { FormularConferenciaCega } from './components/FormularConferenciaCega';

interface ConfCegaProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

interface FornecedorFiltro {
  id: string;
  nome_fantasia: string;
}

export function ConfCega({ usuarioLogadoId, onVoltarParaHome }: ConfCegaProps) {
  const [loading, setLoading] = useState(true);
  const [conferencias, setConferencias] = useState<ConferenciaMestreDTO[]>([]);
  const [activeTab, setActiveTab] = useState<'Em Andamento' | 'Concluída'>('Em Andamento');
  
  // Parâmetros Automáticos de Recebimento
  const [dataRecebimento] = useState(new Date().toLocaleDateString('pt-BR'));
  const [horaRecebimento] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [responsavelNome, setResponsavelNome] = useState('Buscando...');

  // Inputs Manuais do Usuário
  const [pedidosAbertos, setPedidosAbertos] = useState<any[]>([]);
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState('AVULSO');
  
  // Estados para Busca Preditiva de Fornecedores
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [fornecedoresSugeridos, setFornecedoresSugeridos] = useState<FornecedorFiltro[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorFiltro | null>(null);

  const [numeroNF, setNumeroNF] = useState('');
  const [dataEmissaoNF, setDataEmissaoNF] = useState('');
  
  const [criandoOS, setCriandoOS] = useState(false);
  const [painelNovoAberto, setPainelNovoAberto] = useState(false);
  const [conferenciaAtiva, setConferenciaAtiva] = useState<ConferenciaMestreDTO | null>(null);

  async function inicializarModulo() {
    try {
      setLoading(true);
      
      const [dadosConf, resPedidos, { data: user }] = await Promise.all([
        conferenciasService.listarConferencias(),
        supabase.from('pedidos_mestre').select(`id, codigo_customizado, fornecedores:fornecedor_id ( id, nome_fantasia )`).eq('status', 'Pendente Confirmação Vendedor') as any,
        supabase.from('usuarios').select('nome').eq('id', usuarioLogadoId).single()
      ]);

      setConferencias(dadosConf);
      const listaPedidos = resPedidos.data || [];
      setPedidosAbertos(listaPedidos);
      if (user) setResponsavelNome(user.nome);

      if (listaPedidos.length > 0) {
        setPedidoSelecionadoId(listaPedidos[0].id);
        const f = listaPedidos[0].fornecedores;
        const fornObjeto = Array.isArray(f) ? f[0] : f;
        if (fornObjeto) {
          setFornecedorSelecionado({
            id: fornObjeto.id,
            nome_fantasia: fornObjeto.nome_fantasia
          });
        }
      } else {
        setPedidoSelecionadoId('AVULSO');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    inicializarModulo();
  }, []);

  useEffect(() => {
    async function filtrarFornecedores() {
      if (buscaFornecedor.trim().length < 2) {
        setFornecedoresSugeridos([]);
        return;
      }
      try {
        const { data } = await supabase
          .from('fornecedores')
          .select('id, nome_fantasia')
          .ilike('nome_fantasia', `%${buscaFornecedor}%`)
          .limit(5);

        setFornecedoresSugeridos(data || []);
      } catch (err) {
        console.error(err);
      }
    }
    const timer = setTimeout(filtrarFornecedores, 300);
    return () => clearTimeout(timer);
  }, [buscaFornecedor]);

  const calcularPrazoEntrega = () => {
    if (!dataEmissaoNF) return 'Aguardando data...';
    const emissao = new Date(dataEmissaoNF + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diferencaTempo = hoje.getTime() - emissao.getTime();
    const diferencaDias = Math.floor(diferencaTempo / (1000 * 60 * 60 * 24));
    
    if (isNaN(diferencaDias)) return 'Data inválida';
    return diferencaDias === 0 ? 'Entrega no mesmo dia' : `${diferencaDias} Dias de Intervalo`;
  };

  const handleDispararNovaConferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroNF.trim() || !dataEmissaoNF || criandoOS) {
      alert('Preencha os dados da Nota Fiscal.');
      return;
    }

    const ehAvulso = pedidoSelecionadoId === 'AVULSO';
    if (ehAvulso && !fornecedorSelecionado) {
      alert('Identifique o Fornecedor Emissor da Nota.');
      return;
    }

    try {
      setCriandoOS(true);
      
      // Cria no banco e recupera o registro persistido completo
      const novaMestre = await conferenciasService.criarConferencia({
        pedido_mestre_id: ehAvulso ? null : pedidoSelecionadoId,
        fornecedor_id: fornecedorSelecionado ? fornecedorSelecionado.id : null,
        numero_nota_fiscal: numeroNF,
        data_emissao_nota: dataEmissaoNF,
        usuario_id: usuarioLogadoId
      });
      
      // Converte para DTO para correspondência de estado imediata
      const dtoDireto: ConferenciaMestreDTO = {
        id: novaMestre.id,
        codigo_customizado: novaMestre.codigo_customizado,
        pedido_mestre_id: novaMestre.pedido_mestre_id,
        pedido_codigo_customizado: ehAvulso ? 'RECEBIMENTO DIRETO (NF)' : 'PEDIDO VINCULADO',
        fornecedor_id: novaMestre.fornecedor_id,
        fornecedor_nome_fantasia: fornecedorSelecionado ? fornecedorSelecionado.nome_fantasia : 'FORNECEDOR',
        usuario_id: novaMestre.usuario_id,
        usuario_nome: responsavelNome,
        status: 'Em Andamento',
        numero_nota_fiscal: novaMestre.numero_nota_fiscal,
        data_emissao_nota: novaMestre.data_emissao_nota,
        data_conferencia: novaMestre.data_conferencia,
        hora_conferencia: novaMestre.hora_conferencia,
        created_at: novaMestre.created_at
      };

      setPainelNovoAberto(false);
      setNumeroNF('');
      setDataEmissaoNF('');
      setBuscaFornecedor('');
      
      // DIRECIONAMENTO IMEDIATO: Abre a tela de contagem na hora!
      setConferenciaAtiva(dtoDireto);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar manifesto de entrada. Verifique os campos ou cache do banco.');
    } finally {
      setCriandoOS(false);
    }
  };

  const conferenciasFiltradas = conferencias.filter(c => c.status === activeTab);

  if (conferenciaAtiva) {
    return (
      <FormularConferenciaCega 
        conferencia={conferenciaAtiva} 
        onVoltar={() => { setConferenciaAtiva(null); inicializarModulo(); }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex justify-center items-start">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Conf. Cega</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Recebimento e Manifesto de NF</p>
            </div>
          </div>
          <button
            onClick={() => setPainelNovoAberto(!painelNovoAberto)}
            className="bg-[#09797a] text-white text-xs font-black px-4 py-3 rounded-2xl shadow-md active:scale-95 transition-all"
          >
            {painelNovoAberto ? 'Ver Histórico' : '+ Receber'}
          </button>
        </div>

        {painelNovoAberto ? (
          <form onSubmit={handleDispararNovaConferencia} className="flex flex-col gap-3.5 bg-gray-50/60 border border-gray-200 p-4 rounded-3xl mb-5 animate-scale-up">
            
            {/* INFORMAÇÕES AUTOMÁTICAS */}
            <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-2xl border border-gray-100 text-[10px] text-gray-500 font-bold">
              <div>Data: <span className="text-gray-700 font-black">{dataRecebimento}</span></div>
              <div>Hora: <span className="text-gray-700 font-black">{horaRecebimento}</span></div>
              <div className="col-span-2 border-t border-gray-50 pt-1.5 mt-1 truncate">Conferente: <span className="text-[#09797a] font-black uppercase">{responsavelNome}</span></div>
            </div>

            {/* ENTRADAS MANUAIS */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Número da Nota Fiscal</label>
              <input
                type="text"
                required
                value={numeroNF}
                onChange={(e) => setNumeroNF(e.target.value)}
                placeholder="EX: 000.123.456"
                className="w-full h-11 text-xs bg-white border border-gray-200 px-4 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 uppercase"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Data de Emissão da NF</label>
              <input
                type="date"
                required
                value={dataEmissaoNF}
                onChange={(e) => setDataEmissaoNF(e.target.value)}
                className="w-full h-11 text-xs bg-white border border-gray-200 px-4 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
              />
            </div>

            <div className="bg-teal-50/60 border border-teal-100 px-3 py-2 rounded-xl text-[10px] font-bold text-teal-800 flex justify-between">
              <span>PRAZO DE ENTREGA:</span>
              <span className="font-black uppercase">{calcularPrazoEntrega()}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Vincular Origem / Pedido</label>
              <select
                value={pedidoSelecionadoId}
                onChange={(e) => {
                  setPedidoSelecionadoId(e.target.value);
                  if (e.target.value !== 'AVULSO') {
                    const ped = pedidosAbertos.find(p => p.id === e.target.value);
                    const f = ped?.fornecedores;
                    const fornObjeto = Array.isArray(f) ? f[0] : f;
                    if (fornObjeto) {
                      setFornecedorSelecionado({ id: fornObjeto.id, nome_fantasia: fornObjeto.nome_fantasia });
                    }
                  } else {
                    setFornecedorSelecionado(null);
                    setBuscaFornecedor('');
                  }
                }}
                className="w-full text-xs bg-white border border-gray-200 px-3 h-11 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
              >
                {pedidosAbertos.map(p => (
                  <option key={p.id} value={p.id}>ORDEM: {p.codigo_customizado} | {Array.isArray(p.fornecedores) ? p.fornecedores[0]?.nome_fantasia : p.fornecedores?.nome_fantasia}</option>
                ))}
                <option value="AVULSO">RECEBIMENTO DIRETO (SEM PEDIDO HAZON)</option>
              </select>
            </div>

            {/* BUSCA PREDITIVA DO FORNECEDOR EMISSOR */}
            {pedidoSelecionadoId === 'AVULSO' && (
              <div className="flex flex-col gap-1 relative">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Selecione o Fornecedor Emissor</label>
                {fornecedorSelecionado ? (
                  <div className="w-full bg-teal-50/50 border border-teal-200 rounded-xl px-4 py-2.5 flex justify-between items-center animate-fade-in">
                    <span className="text-xs font-black text-teal-800 uppercase block truncate">{fornecedorSelecionado.nome_fantasia}</span>
                    <button
                      type="button"
                      onClick={() => setFornecedorSelecionado(null)}
                      className="text-red-500 font-bold text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={buscaFornecedor}
                      onChange={(e) => setBuscaFornecedor(e.target.value)}
                      placeholder="DIGITE QUALQUER PARTE DO NOME DO FORNECEDOR..."
                      className="w-full h-11 text-xs bg-white border border-gray-200 px-4 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 uppercase"
                    />
                    {fornecedoresSugeridos.length > 0 && (
                      <div className="absolute top-16 left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-10 flex flex-col">
                        {fornecedoresSugeridos.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => {
                              setFornecedorSelecionado(f);
                              setFornecedoresSugeridos([]);
                            }}
                            className="px-4 py-2.5 hover:bg-teal-50/40 cursor-pointer border-b border-gray-50 last:border-0 text-left text-xs font-black text-gray-700 uppercase block truncate"
                          >
                            {f.nome_fantasia}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={criandoOS}
              className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-black uppercase shadow-md active:scale-95 transition-all mt-1"
            >
              {criandoOS ? 'Registrando Manifesto...' : 'Confirmar e Abrir Coleta'}
            </button>
          </form>
        ) : (
          <>
            {/* SELETORES DE ABA */}
            <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-2xl mb-5">
              {(['Em Andamento', 'Concluída'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 text-[10px] font-black rounded-xl uppercase transition-all ${activeTab === tab ? 'bg-[#09797a] text-white shadow-sm' : 'text-gray-400'}`}
                >
                  {tab === 'Em Andamento' ? 'Em Curso' : 'Concluídas'}
                </button>
              ))}
            </div>

            {/* LISTAGEM HISTÓRICA */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-230px)] pb-4 flex flex-col gap-3">
              {loading ? (
                <p className="text-center text-gray-400 text-xs font-bold py-10">Buscando notas recebidas...</p>
              ) : conferenciasFiltradas.length === 0 ? (
                <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhuma nota fiscal registrada nesta etapa.</p>
              ) : (
                conferenciasFiltradas.map((conf) => (
                  <div
                    key={conf.id}
                    onClick={() => setConferenciaAtiva(conf)}
                    className="border border-gray-200 rounded-3xl p-4 bg-gray-50/40 flex justify-between items-center shadow-sm cursor-pointer hover:border-[#09797a]"
                  >
                    <div className="flex flex-col gap-1 truncate max-w-[70%]">
                      <span className="text-[9px] text-gray-400 font-mono font-black">Manifesto: {conf.codigo_customizado}</span>
                      <span className="text-xs font-black text-gray-700 truncate uppercase">{conf.fornecedor_nome_fantasia}</span>
                      <span className="text-[9px] text-gray-500 font-bold">NF: {conf.numero_nota_fiscal || 'NÃO INFORMADA'}</span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase border ${conf.status === 'Concluída' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {conf.status === 'Concluída' ? 'Feito' : 'Bipar'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}