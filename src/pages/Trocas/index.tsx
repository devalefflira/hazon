// Arquivo: src/pages/Trocas/index.tsx
import { useState, useEffect } from 'react';
import { trocasService } from './services/trocasService';
import type { TrocaItem } from './services/trocasService';

interface TrocasProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
}

const STATUS_OPCOES = [
  'Não iniciado',
  'Comunicado ao fornecedor',
  'Aguardando retorno do fornecedor',
  'Negociação Finalizada'
];

export default function Trocas({ onVoltarParaHome, usuarioLogado }: TrocasProps) {
  const [trocas, setTrocas] = useState<TrocaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Aba ativa: 'NAO_REALIZADAS' ou 'REALIZADAS'
  const [abaAtiva, setAbaAtiva] = useState<'NAO_REALIZADAS' | 'REALIZADAS'>('NAO_REALIZADAS');

  // Modal de Negociação
  const [itemSelecionado, setItemSelecionado] = useState<TrocaItem | null>(null);
  const [statusNegociacao, setStatusNegociacao] = useState('Não iniciado');
  const [fornecedorId, setFornecedorId] = useState('');
  const [termoBuscaForn, setTermoBuscaForn] = useState('');
  const [fornecedoresSugeridos, setFornecedoresSugeridos] = useState<any[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<any | null>(null);
  const [anotacoes, setAnotacoes] = useState('');
  const [previsaoTroca, setPrevisaoTroca] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarTrocas = async () => {
    try {
      setLoading(true);
      const lista = await trocasService.listarTrocas();
      setTrocas(lista);
    } catch (err) {
      console.error('Erro ao carregar trocas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTrocas();
  }, []);

  // Busca fornecedor por digitação
  useEffect(() => {
    if (!termoBuscaForn.trim() || fornecedorSelecionado) {
      setFornecedoresSugeridos([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await trocasService.buscarFornecedores(termoBuscaForn);
        setFornecedoresSugeridos(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBuscaForn, fornecedorSelecionado]);

  const handleAbrirModal = (item: TrocaItem) => {
    setItemSelecionado(item);
    setStatusNegociacao(item.status || 'Não iniciado');
    setFornecedorId(item.fornecedor_id || item.fornecedor?.id || '');
    setFornecedorSelecionado(item.fornecedor || null);
    setTermoBuscaForn(item.fornecedor ? (item.fornecedor.nome_fantasia || item.fornecedor.razao_social) : '');
    setAnotacoes(item.anotacoes || '');
    setPrevisaoTroca(item.previsao_troca || '');
  };

  const handleSalvarNegociacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSelecionado) return;

    try {
      setSalvando(true);
      await trocasService.salvarNegociacao({
        avaria_id: itemSelecionado.avaria_id,
        fornecedor_id: fornecedorId || undefined,
        status: statusNegociacao,
        anotacoes: anotacoes,
        previsao_troca: previsaoTroca || undefined
      });

      alert('Negociação de troca salva com sucesso!');
      setItemSelecionado(null);
      carregarTrocas();
    } catch (err) {
      alert('Erro ao salvar negociação.');
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarRecebimento = async (item: TrocaItem) => {
    const userObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');
    if (!userObj?.id) {
      alert('Usuário não autenticado.');
      return;
    }

    const prodDesc = item.avaria?.produtos?.descricao || 'este item';
    if (!confirm(`Confirmar que a troca do produto "${prodDesc}" chegou fisicamente na loja?`)) {
      return;
    }

    try {
      await trocasService.confirmarRecebimentoTroca(item.avaria_id, userObj.id);
      carregarTrocas();
    } catch (err) {
      alert('Erro ao confirmar recebimento da troca.');
    }
  };

  // Separação das Abas
  const trocasNaoRealizadas = trocas.filter((t: TrocaItem) => t.status !== 'Negociação Finalizada');
  const trocasRealizadas = trocas.filter((t: TrocaItem) => t.status === 'Negociação Finalizada');

  const listaExibicao = abaAtiva === 'NAO_REALIZADAS' ? trocasNaoRealizadas : trocasRealizadas;

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome}
              className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">TROCAS</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Acompanhamento e Negociação com Fornecedores</p>
            </div>
          </div>
        </div>

        {/* ABAS */}
        <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('NAO_REALIZADAS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${
              abaAtiva === 'NAO_REALIZADAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'
            }`}
          >
            Trocas Não Realizadas ({trocasNaoRealizadas.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('REALIZADAS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${
              abaAtiva === 'REALIZADAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'
            }`}
          >
            Trocas Realizadas ({trocasRealizadas.length})
          </button>
        </div>

        {/* LISTAGEM */}
        <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando trocas...</div>
          ) : listaExibicao.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhuma troca encontrada nesta categoria.
            </div>
          ) : (
            listaExibicao.map((item: TrocaItem) => {
              const av = item.avaria || ({} as any);
              const prod: any = av.produtos || {};
              const dataColetaFmt = av.data_registro
                ? new Date(av.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')
                : 'N/I';

              const previsaoFmt = item.previsao_troca
                ? new Date(item.previsao_troca + 'T00:00:00').toLocaleDateString('pt-BR')
                : null;

              const fornNome = item.fornecedor?.nome_fantasia || item.fornecedor?.razao_social;

              return (
                <div
                  key={av.id}
                  className="p-4 bg-white border border-gray-200 rounded-3xl flex flex-col gap-2 shadow-xs hover:border-[#09797a]/40 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg uppercase">
                        {av.codigo_customizado}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-gray-400">
                        Cód: {prod.codprod || 'N/A'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase ${
                      item.status === 'Negociação Finalizada' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'Não iniciado' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="font-black text-xs text-gray-800 uppercase leading-snug">
                    {prod.descricao || 'PRODUTO NÃO IDENTIFICADO'}
                  </h3>

                  <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2 flex-wrap">
                    <span>QTD AVARIADA: <strong className="text-gray-800">{av.quantidade} {prod.unidade || 'UN'}</strong></span>
                    <span>|</span>
                    <span>COLETA: <strong className="text-gray-800">{dataColetaFmt}</strong></span>
                    {fornNome && (
                      <>
                        <span>|</span>
                        <span>FORNECEDOR: <strong className="text-[#09797a]">{fornNome}</strong></span>
                      </>
                    )}
                  </div>

                  {/* Informações adicionais na aba Realizadas */}
                  {abaAtiva === 'REALIZADAS' && (
                    <div className="flex flex-col gap-1 pt-1.5 border-t border-gray-100 text-[10px]">
                      {previsaoFmt && (
                        <span className="font-bold text-gray-600">
                          📅 Previsão de Troca: <strong className="text-gray-800">{previsaoFmt}</strong>
                        </span>
                      )}
                      {item.anotacoes && (
                        <div className="bg-emerald-50/60 border border-emerald-200 text-emerald-900 p-2 rounded-xl">
                          <strong className="uppercase">Anotações:</strong> {item.anotacoes}
                        </div>
                      )}

                      {/* Identificação de recebimento na loja */}
                      {item.troca_realizada ? (
                        <div className="bg-emerald-100 text-emerald-900 font-bold p-2 rounded-xl mt-1 flex items-center gap-1.5 text-[10px] font-mono">
                          <span>👍 Entregue na Loja</span>
                          <span>- Recebido por <strong>{item.usuario_recebedor?.nome || 'USUÁRIO'}</strong> em {item.recebido_data ? new Date(item.recebido_data + 'T00:00:00').toLocaleDateString('pt-BR') : ''} às {item.recebido_hora || ''}</span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex justify-end items-center gap-2 pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleAbrirModal(item)}
                      className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase transition-all"
                    >
                      ✏️ {abaAtiva === 'NAO_REALIZADAS' ? 'Negociar' : 'Editar'}
                    </button>

                    {abaAtiva === 'REALIZADAS' && !item.troca_realizada && (
                      <button
                        type="button"
                        onClick={() => handleConfirmarRecebimento(item)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 transition-all flex items-center gap-1"
                        title="Confirmar que a troca chegou na loja"
                      >
                        <span>👍</span> Confirmar Entrega
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* MODAL DE NEGOCIAÇÃO DE TROCA */}
      {itemSelecionado && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <form
            onSubmit={handleSalvarNegociacao}
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">
                NEGOCIAR TROCA ({itemSelecionado.avaria.codigo_customizado})
              </h3>
              <button
                type="button"
                onClick={() => setItemSelecionado(null)}
                className="text-gray-400 font-bold text-base"
              >
                ✕
              </button>
            </div>

            {/* DADOS DO PRODUTO NO TOPO DO MODAL */}
            <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-mono font-bold">Cód: {itemSelecionado.avaria.produtos?.codprod}</span>
                <span className="text-red-600 font-black">Qtd: {itemSelecionado.avaria.quantidade} {itemSelecionado.avaria.produtos?.unidade || 'UN'}</span>
              </div>
              <h4 className="font-black text-gray-800 uppercase">
                {itemSelecionado.avaria.produtos?.descricao}
              </h4>
              <span className="text-[10px] text-gray-400 font-mono">
                Data Coleta: {itemSelecionado.avaria.data_registro ? new Date(itemSelecionado.avaria.data_registro + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/I'}
              </span>
            </div>

            <div className="overflow-y-auto flex flex-col gap-3 pr-1 flex-1">
              {/* BUSCA DE FORNECEDOR POR DIGITAÇÃO */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Fornecedor *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
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

                {/* LISTA SUSPENSA DE FORNECEDORES */}
                {fornecedoresSugeridos.length > 0 && !fornecedorSelecionado && (
                  <div className="absolute top-15 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-30 divide-y divide-gray-100">
                    {fornecedoresSugeridos.map((f: any) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setFornecedorSelecionado(f);
                          setFornecedorId(f.id);
                          setTermoBuscaForn(f.nome_fantasia || f.razao_social);
                          setFornecedoresSugeridos([]);
                        }}
                        className="w-full text-left p-2.5 hover:bg-emerald-50 text-xs font-bold text-gray-800 uppercase flex flex-col"
                      >
                        <span>{f.nome_fantasia || f.razao_social}</span>
                        <span className="text-[9px] text-gray-400 font-mono">CNPJ: {f.cnpj}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* STATUS DA NEGOCIAÇÃO */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Status da Negociação *</label>
                <select
                  value={statusNegociacao}
                  onChange={(e) => setStatusNegociacao(e.target.value)}
                  className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                >
                  {STATUS_OPCOES.map((st) => (
                    <option key={st} value={st}>{st.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* CAMPOS CONDICIONAIS: QUANDO STATUS FOR 'Negociação Finalizada' */}
              {statusNegociacao === 'Negociação Finalizada' && (
                <div className="flex flex-col gap-3 bg-emerald-50/50 border border-emerald-200 p-3 rounded-2xl animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase px-1">Previsão de Troca (Data) *</label>
                    <input
                      type="date"
                      required
                      value={previsaoTroca}
                      onChange={(e) => setPrevisaoTroca(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-emerald-300 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase px-1">Anotações da Negociação</label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Fornecedor confirmou o envio de 10 unidades na próxima quinta-feira..."
                      value={anotacoes}
                      onChange={(e) => setAnotacoes(e.target.value)}
                      className="w-full text-xs bg-white border border-emerald-300 p-3 rounded-xl font-medium text-gray-800 uppercase"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* BOTÕES */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setItemSelecionado(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                {salvando ? 'Salvando...' : 'Salvar Negociação'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}