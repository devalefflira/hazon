// Arquivo: src/pages/Temperatura/index.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { temperaturaService } from './services/temperaturaService';
import type { EquipamentoFrioDTO, AfericaoTemperaturaDTO } from './types/temperatura.types';
import { CapturaFotoModal } from './components/CapturaFotoModal';

interface TemperaturaProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

type ModoSub_Modulo = 'lista-afericoes' | 'novo-cadastro' | 'lista-equipamentos' | 'nova-afericao';
type FiltroTempoChave = 'TODOS' | 'HOJE' | 'ONTEM' | 'DATA_ESPECIFICA';

const MAPA_CATEGORIAS_FRIOS = {
  'Congelados em Geral': { conforme: -18, limite: -12, nao_conforme: -11.9 },
  'Peixes e Pescados': { conforme: 0, limite: 4, nao_conforme: 4.1 },
  'Carnes Frescas / Bandejados': { conforme: 0, limite: 7, nao_conforme: 7.1 },
  'Linguiças e Embutidos': { conforme: 0, limite: 8, nao_conforme: 8.1 },
  'Laticínios e Frios': { conforme: 2, limite: 10, nao_conforme: 10.1 },
  'Hortifruti (FLV)': { conforme: 8, limite: 5, nao_conforme: 3.9 }
};

type CategoriaChave = keyof typeof MAPA_CATEGORIAS_FRIOS;

export default function Temperatura({ usuarioLogadoId, onVoltarParaHome }: TemperaturaProps) {
  const [modo, setModo] = useState<ModoSub_Modulo>('lista-afericoes');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [operadorNome, setOperadorNome] = useState('Buscando...');

  const [equipamentos, setEquipamentos] = useState<EquipamentoFrioDTO[]>([]);
  const [afericoes, setAfericoes] = useState<AfericaoTemperaturaDTO[]>([]);

  // 🎛️ ESTADOS DOS NOVOS FILTROS OPERACIONAIS
  const [filtroTempo, setFiltroTempo] = useState<FiltroTempoChave>('TODOS');
  const [filtroDataCustom, setFiltroDataCustom] = useState('');
  const [filtroAparelhoId, setFiltroAparelhoId] = useState('TODOS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  // 📄 ESTADOS DA PAGINAÇÃO (10 REGISTROS POR PÁGINA)
  const [paginaAtual, setPaginaAtiva] = useState(1);
  const registrosPorPagina = 10;

  // Form Novo Cadastro Equipamento
  const [tipoItem, setTipoItem] = useState('Ilha Horizontal');
  const [nomeEquipamento, setNomeEquipamento] = useState('');
  const [categoriaFrio, setCategoriaFrio] = useState<CategoriaChave>('Congelados em Geral');

  // Form Nova Aferição Manual + Evidência Visual
  const [equipamentoSelecionadoId, setEquipamentoSelecionadoId] = useState('');
  const [temperaturaDigitada, setTemperaturaDigitada] = useState('');
  const [fotoBase64, setFotoBase64] = useState(''); 
  const [cameraAberta, setCameraAberta] = useState(false);

  const [dataRecebimento] = useState(new Date().toLocaleDateString('pt-BR'));
  const [horaRecebimento] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

  const tempsRegra = MAPA_CATEGORIAS_FRIOS[categoriaFrio];

  async function carregarDados() {
    try {
      setLoading(true);
      const [equips, afers, { data: user }] = await Promise.all([
        temperaturaService.listarEquipamentos(),
        temperaturaService.listarAfericoes(),
        supabase.from('usuarios').select('nome').eq('id', usuarioLogadoId).single()
      ]);
      setEquipamentos(equips);
      setAfericoes(afers);
      if (user) setOperadorNome(user.nome);
      if (equips && equips.length > 0) setEquipamentoSelecionadoId(equips[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // Reseta para a página 1 sempre que o operador mexer em algum filtro
  useEffect(() => {
    setPaginaAtiva(1);
  }, [filtroTempo, filtroDataCustom, filtroAparelhoId, filtroStatus]);

  // 📊 PIPELINE DE FILTRAGEM DINÂMICA (EM TEMPO REAL)
  const afericoesFiltradas = afericoes.filter((af) => {
    // 1. Filtro por Período de Tempo
    const hojeStr = new Date().toISOString().split('T')[0];
    
    if (filtroTempo === 'HOJE') {
      if (af.data_registro !== hojeStr) return false;
    } else if (filtroTempo === 'ONTEM') {
      const ontemObj = new Date();
      ontemObj.setDate(ontemObj.getDate() - 1);
      const ontemStr = ontemObj.toISOString().split('T')[0];
      if (af.data_registro !== ontemStr) return false;
    } else if (filtroTempo === 'DATA_ESPECIFICA' && filtroDataCustom) {
      if (af.data_registro !== filtroDataCustom) return false;
    }

    // 2. Filtro por Equipamento/Aparelho
    if (filtroAparelhoId !== 'TODOS' && af.equipamento_id !== filtroAparelhoId) {
      return false;
    }

    // 3. Filtro por Status Térmico
    if (filtroStatus !== 'TODOS' && af.status_resultado !== filtroStatus) {
      return false;
    }

    return true;
  });

  // 📐 CÁLCULO MESTRE DA PAGINAÇÃO E CORTES DE SLICE
  const totalPaginas = Math.ceil(afericoesFiltradas.length / registrosPorPagina) || 1;
  const indexUltimoRegistro = paginaAtual * registrosPorPagina;
  const indexPrimeiroRegistro = indexUltimoRegistro - registrosPorPagina;
  const afericoesPaginadas = afericoesFiltradas.slice(indexPrimeiroRegistro, indexUltimoRegistro);

  const handleSalvarEquipamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEquipamento.trim()) return;
    try {
      setSalvando(true);
      await temperaturaService.cadastrarEquipamento({
        tipo_item: tipoItem,
        nome: nomeEquipamento,
        categoria_frio: categoriaFrio,
        temp_conforme: tempsRegra.conforme,
        temp_limite_tolerancia: tempsRegra.limite,
        temp_nao_conforme: tempsRegra.nao_conforme
      });
      alert('🧊 Equipamento termicamente mapeado e travado por categoria!');
      setNomeEquipamento('');
      setCategoriaFrio('Congelados em Geral');
      await carregarDados();
      setModo('lista-equipamentos');
    } catch (err) {
      alert('Erro ao registrar equipamento.');
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarAfericao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipamentoSelecionadoId || temperaturaDigitada === '' || !fotoBase64) {
      alert('Preencha a temperatura e tire a foto de comprovação em tempo real.');
      return;
    }
    try {
      setSalvando(true);
      await temperaturaService.registrarAfericao({
        equipamento_id: equipamentoSelecionadoId,
        usuario_id: usuarioLogadoId,
        temperatura_aferida: Number(temperaturaDigitada),
        foto_comprobatoria: fotoBase64 
      });
      setTemperaturaDigitada('');
      setFotoBase64('');
      await carregarDados();
      alert('🎯 Aferição auditada e salva com sucesso!');
      setModo('lista-afericoes');
    } catch (err) {
      alert('Erro ao gravar medição auditada.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-lg leading-none uppercase">Controle de Frios</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Cadeia de Custódia e Temperatura</p>
            </div>
          </div>
        </div>

        {/* CONTROLES SUPERIORES */}
        <div className="grid grid-cols-3 gap-2 mb-5 select-none">
          <button type="button" onClick={() => { setModo('nova-afericao'); setTemperaturaDigitada(''); setFotoBase64(''); }} className={`py-2 px-1 text-[9px] font-black rounded-xl uppercase transition-all shadow-xs ${modo === 'nova-afericao' ? 'bg-[#09797a] text-white' : 'bg-gray-100 text-gray-400'}`}>⚡ Nova Aferição</button>
          <button type="button" onClick={() => setModo('novo-cadastro')} className={`py-2 px-1 text-[9px] font-black rounded-xl uppercase transition-all shadow-xs ${modo === 'novo-cadastro' ? 'bg-[#09797a] text-white' : 'bg-gray-100 text-gray-400'}`}>➕ Novo Cadastro</button>
          <button type="button" onClick={() => setModo('lista-equipamentos')} className={`py-2 px-1 text-[9px] font-black rounded-xl uppercase transition-all shadow-xs ${modo === 'lista-equipamentos' ? 'bg-[#09797a] text-white' : 'bg-gray-100 text-gray-400'}`}>📟 Aparelhos</button>
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div className="flex-1 flex flex-col">
          {loading ? (
            <p className="text-center text-gray-400 text-xs font-bold py-10 animate-pulse">Sincronizando sensores térmicos...</p>
          ) : (
            <>
              {/* SUB-VIEW 1: FORMULÁRIO DE NOVA AFERIÇÃO */}
              {modo === 'nova-afericao' && (
                <div className="flex flex-col gap-3.5 bg-gray-50 p-4 rounded-3xl border border-gray-200 animate-scale-up">
                  {cameraAberta && (
                    <CapturaFotoModal
                      onFotoCapturada={(base64) => { setFotoBase64(base64); setCameraAberta(false); }}
                      onFechar={() => setCameraAberta(false)}
                    />
                  )}

                  <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-gray-100 text-[10px] text-gray-500 font-bold">
                    <div>📅 Data: <span className="text-gray-700 font-black block mt-0.5">{dataRecebimento}</span></div>
                    <div>🕒 Hora: <span className="text-gray-700 font-black block mt-0.5">{horaRecebimento}</span></div>
                    <div className="truncate">👤 Auditor: <span className="text-[#09797a] font-black uppercase block mt-0.5 truncate">{operadorNome}</span></div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Equipamento Alvo</label>
                    <select
                      value={equipamentoSelecionadoId}
                      onChange={(e) => setEquipamentoSelecionadoId(e.target.value)}
                      className="w-full h-11 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-700 focus:outline-none"
                    >
                      {equipamentos.length === 0 ? (
                        <option value="">NENHUM APARELHO CADASTRADO</option>
                      ) : (
                        equipamentos.map(eq => <option key={eq.id} value={eq.id}>{eq.nome} ({eq.tipo_item.toUpperCase()})</option>)
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Temperatura no Termômetro (°C)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={temperaturaDigitada}
                      onChange={(e) => setTemperaturaDigitada(e.target.value)}
                      placeholder="EX: -18.5"
                      className="w-full h-11 text-xs bg-white border border-gray-200 px-4 rounded-xl font-bold text-gray-700 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Foto Comprobatória (Obrigatória)</label>
                    {fotoBase64 ? (
                      <div className="relative w-full rounded-2xl overflow-hidden border border-emerald-200 bg-emerald-50 p-2 flex flex-col items-center gap-2">
                        <img src={fotoBase64} alt="Evidência" className="w-full h-32 object-cover rounded-xl shadow-xs" />
                        <span className="text-[10px] text-emerald-700 font-black uppercase">✔ FOTO REGISTRADA NA SESSÃO</span>
                        <button type="button" onClick={() => setFotoBase64('')} className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-1.5 text-xs font-bold leading-none">✕</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCameraAberta(true)}
                        className="w-full h-14 border-2 border-dashed border-orange-300 hover:border-[#09797a] bg-orange-50/50 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-orange-800 uppercase tracking-wide transition-all"
                      >
                        📸 Bater Foto do Termômetro
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={handleSalvarAfericao}
                      disabled={salvando || !temperaturaDigitada || !fotoBase64 || equipamentos.length === 0}
                      className="flex-1 bg-[#09797a] text-white py-4 rounded-3xl text-xs font-black uppercase shadow-md disabled:opacity-30 transition-all"
                    >
                      {salvando ? 'Salvando Auditoria...' : 'Gravar Medição'}
                    </button>
                    <button type="button" onClick={() => { setTemperaturaDigitada(''); setFotoBase64(''); setModo('lista-afericoes'); }} className="bg-gray-200 text-gray-500 text-xs font-bold px-4 rounded-3xl">Cancelar</button>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: NOVO CADASTRO DE EQUIPAMENTO */}
              {modo === 'novo-cadastro' && (
                <form onSubmit={handleSalvarEquipamento} className="flex flex-col gap-3.5 bg-gray-50 p-4 rounded-3xl border border-gray-200 animate-scale-up">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Tipo de Equipamento</label>
                    <select
                      value={tipoItem}
                      onChange={(e) => setTipoItem(e.target.value)}
                      className="w-full h-11 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-700"
                    >
                      <option value="Ilha Horizontal">ILHA HORIZONTAL</option>
                      <option value="Ilha Vertical">ILHA VERTICAL</option>
                      <option value="Câmara Fria">CÂMARA FRIA</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Categoria de Frios/Congelados</label>
                    <select
                      value={categoriaFrio}
                      onChange={(e) => setCategoriaFrio(e.target.value as CategoriaChave)}
                      className="w-full h-11 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-[#09797a] focus:outline-none"
                    >
                      {Object.keys(MAPA_CATEGORIAS_FRIOS).map(cat => (
                        <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Nome de Identificação</label>
                    <input
                      type="text"
                      required
                      value={nomeEquipamento}
                      onChange={(e) => setNomeEquipamento(e.target.value)}
                      placeholder="EX: EXPOSITOR DE LATICÍNIOS 02"
                      className="w-full h-11 text-xs bg-white border border-gray-200 px-4 rounded-xl font-bold text-gray-700 uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 select-none">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black text-emerald-600 uppercase px-1">Conforme (°C)</label>
                      <input type="number" disabled value={tempsRegra.conforme} className="w-full h-10 text-xs bg-gray-200 border border-gray-300 text-center rounded-xl font-black text-gray-600 cursor-not-allowed" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black text-amber-600 uppercase px-1">Limite (°C)</label>
                      <input type="number" disabled value={tempsRegra.limite} className="w-full h-10 text-xs bg-gray-200 border border-gray-300 text-center rounded-xl font-black text-gray-600 cursor-not-allowed" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black text-red-600 uppercase px-1">Não Conf (°C)</label>
                      <input type="number" disabled value={tempsRegra.nao_conforme} className="w-full h-10 text-xs bg-gray-200 border border-gray-300 text-center rounded-xl font-black text-gray-600 cursor-not-allowed" />
                    </div>
                  </div>

                  <button type="submit" disabled={salvando} className="w-full bg-[#09797a] text-white py-3.5 rounded-2xl text-xs font-black uppercase shadow-sm mt-1">Salvar Configuração</button>
                </form>
              )}

              {/* SUB-VIEW 3: LISTAGEM DE EQUIPAMENTOS */}
              {modo === 'lista-equipamentos' && (
                <div className="flex flex-col gap-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {equipamentos.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhum equipamento cadastrado.</p>
                  ) : (
                    equipamentos.map(eq => (
                      <div key={eq.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center gap-2">
                        <div className="truncate max-w-[55%]">
                          <h4 className="text-xs font-black text-gray-700 truncate uppercase">{eq.nome}</h4>
                          <span className="text-[8px] text-gray-400 font-bold block truncate uppercase">{eq.categoria_frio}</span>
                          <span className="text-[9px] text-[#09797a] font-bold block mt-0.5">{eq.tipo_item.toUpperCase()}</span>
                        </div>
                        <div className="flex gap-1 text-[9px] font-mono font-black shrink-0">
                          <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-md border border-emerald-100">{eq.temp_conforme}°C</span>
                          <span className="text-amber-600 bg-amber-50 px-1 py-0.5 rounded-md border border-amber-100">{eq.temp_limite_tolerancia}°C</span>
                          <span className="text-red-600 bg-red-50 px-1 py-0.5 rounded-md border border-red-100">{eq.temp_nao_conforme}°C</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUB-VIEW 4: HISTÓRICO DE AFERIÇÕES COM FILTROS AVANÇADOS E PAGINAÇÃO */}
              {modo === 'lista-afericoes' && (
                <div className="flex flex-col flex-1 gap-2.5">
                  
                  {/* 📊 PAINEL ACORDEÃO DE FILTROS */}
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex flex-col gap-2 shadow-2xs">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Seletor de Tempo */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase px-0.5">Período</span>
                        <select
                          value={filtroTempo}
                          onChange={(e) => setFiltroTempo(e.target.value as FiltroTempoChave)}
                          className="h-8 text-[10px] bg-white border border-gray-200 rounded-lg px-2 font-bold text-gray-700"
                        >
                          <option value="TODOS">TODOS OS DIAS</option>
                          <option value="HOJE">HOJE</option>
                          <option value="ONTEM">ONTEM</option>
                          <option value="DATA_ESPECIFICA">POR DATA ESPECÍFICA</option>
                        </select>
                      </div>

                      {/* Seletor de Status */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase px-0.5">Status Térmico</span>
                        <select
                          value={filtroStatus}
                          onChange={(e) => setFiltroStatus(e.target.value)}
                          className="h-8 text-[10px] bg-white border border-gray-200 rounded-lg px-2 font-bold text-gray-700"
                        >
                          <option value="TODOS">TODOS OS STATUS</option>
                          <option value="Conforme">CONFORME</option>
                          <option value="Limite de Tolerância">LIMITE TOLERÂNCIA</option>
                          <option value="Não Conforme">NÃO CONFORME</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Seletor de Aparelho */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase px-0.5">Aparelho</span>
                        <select
                          value={filtroAparelhoId}
                          onChange={(e) => setFiltroAparelhoId(e.target.value)}
                          className="h-8 text-[10px] bg-white border border-gray-200 rounded-lg px-2 font-bold text-gray-700"
                        >
                          <option value="TODOS">TODOS OS APARELHOS</option>
                          {equipamentos.map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.nome.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      {/* Input de Data Customizada (Condicional) */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase px-0.5">Data Alvo</span>
                        <input
                          type="date"
                          disabled={filtroTempo !== 'DATA_ESPECIFICA'}
                          value={filtroDataCustom}
                          onChange={(e) => setFiltroDataCustom(e.target.value)}
                          className="h-8 text-[10px] bg-white disabled:bg-gray-200 disabled:text-gray-400 border border-gray-200 rounded-lg px-2 font-bold text-gray-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 📑 LISTAGEM DOS 10 ITENS FILTRADOS */}
                  <div className="flex flex-col gap-2.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-0.5">
                    {afericoesPaginadas.length === 0 ? (
                      <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhum registro corresponde aos filtros selecionados.</p>
                    ) : (
                      afericoesPaginadas.map(af => (
                        <div key={af.id} className="p-3.5 bg-gray-50/60 border border-gray-200 rounded-3xl flex flex-col gap-2 shadow-2xs">
                          <div className="flex justify-between items-start gap-4">
                            <div className="truncate max-w-[65%] flex flex-col gap-0.5">
                              <span className="text-[9px] text-gray-400 font-mono font-black">
                                {af.codigo_customizado} | {new Date(af.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')} às {af.hora_registro}
                              </span>
                              <h4 className="text-xs font-black text-gray-700 leading-tight truncate uppercase">{af.equipamento_nome}</h4>
                              <span className="text-[9px] text-gray-400 truncate">Auditor: {af.usuario_nome.toUpperCase()}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-sm font-mono font-black text-gray-800">{af.temperatura_aferida}°C</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border uppercase tracking-tight ${
                                af.status_resultado === 'Conforme' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                af.status_resultado === 'Limite de Tolerância' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                              }`}>{af.status_resultado}</span>
                            </div>
                          </div>
                          {af.foto_comprobatoria && (
                            <div className="w-full h-16 rounded-xl overflow-hidden border border-gray-200 mt-1">
                              <img src={af.foto_comprobatoria} alt="Comprovante" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* 🧱 COMPONENTE DE CONTROLE DE PAGINAÇÃO */}
                  {afericoesFiltradas.length > 0 && (
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-auto select-none">
                      <button
                        type="button"
                        disabled={paginaAtual === 1}
                        onClick={() => setModoPagina(paginaAtual - 1)}
                        className="h-8 px-3 bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-200 text-[11px] font-black uppercase rounded-xl disabled:opacity-40 transition-all active:scale-95"
                      >
                        Anterior
                      </button>
                      <span className="text-[10px] text-gray-400 font-bold">
                        Página <strong className="text-gray-700 font-black">{paginaAtual}</strong> de <strong className="text-gray-700 font-black">{totalPaginas}</strong> <span className="font-medium">({afericoesFiltradas.length} total)</span>
                      </span>
                      <button
                        type="button"
                        disabled={paginaAtual === totalPaginas}
                        onClick={() => setModoPagina(paginaAtual + 1)}
                        className="h-8 px-3 bg-[#09797a] border border-[#065b5c] text-white text-[11px] font-black uppercase rounded-xl disabled:opacity-40 transition-all active:scale-95"
                      >
                        Próxima
                      </button>
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );

  // Auxiliar para setar o estado da página sem fugir dos limites calculados
  function setModoPagina(novaPagina: number) {
    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
      setPaginaAtiva(novaPagina);
    }
  }
}