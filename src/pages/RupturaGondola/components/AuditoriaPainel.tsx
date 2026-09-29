// src/pages/RupturaGondola/components/AuditoriaPainel.tsx
import { useState, useEffect } from 'react';
import { rupturaService } from '../services/rupturaService';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { supabase } from '../../../lib/supabaseClient';
import type { RupturaAuditoria, RupturaItem, ErpEntradaMercadoria } from '../types/ruptura.types';

interface AuditoriaPainelProps {
  auditoriaId: string;
  onVoltar: () => void;
}

export function AuditoriaPainel({ auditoriaId, onVoltar }: AuditoriaPainelProps) {
  const [auditoria, setAuditoria] = useState<RupturaAuditoria | null>(null);
  const [itens, setItens] = useState<RupturaItem[]>([]);
  const [naoExpostos, setNaoExpostos] = useState<ErpEntradaMercadoria[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'auditados' | 'nao_expostos'>('auditados');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosSugeridos, setProdutosSugeridos] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const aud = await rupturaService.obterAuditoriaPorId(auditoriaId);
      const itms = await rupturaService.listarItensAuditoria(auditoriaId);
      setAuditoria(aud);
      setItens(itms);

      const naoExp = await rupturaService.obterProdutosNaoExpostos(auditoriaId);
      setNaoExpostos(naoExp);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [auditoriaId]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (buscaProduto.trim().length >= 2) {
        const { data } = await supabase
          .from('produtos')
          .select('id, codprod, descricao, codbarra, pvenda')
          .or(`descricao.ilike.%${buscaProduto}%,codbarra.eq.${buscaProduto},codprod.eq.${buscaProduto}`)
          .limit(5);
        setProdutosSugeridos(data || []);
      } else {
        setProdutosSugeridos([]);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [buscaProduto]);

  // Manipulador acionado diretamente pela câmara ao ler o código de barras
  const handleCodigoEscaneado = async (codigoLido: string) => {
    try {
      const { data } = await supabase
        .from('produtos')
        .select('id, codprod, descricao, codbarra, pvenda')
        .or(`codbarra.eq.${codigoLido},codprod.eq.${codigoLido}`)
        .limit(1);

      if (data && data.length > 0) {
        setProdutoSelecionado(data[0]);
        setBuscaProduto(`${data[0].codprod} - ${data[0].descricao}`);
      } else {
        alert(`Código de barras [${codigoLido}] não localizado no cadastro de produtos.`);
      }
    } catch (err: any) {
      alert(`Falha ao consultar código: ${err.message}`);
    }
  };

  const registrarAfericao = async (temEstoque: boolean, motivo?: string) => {
    if (!produtoSelecionado) return;

    try {
      await rupturaService.registrarItemAuditoria({
        auditoria_id: auditoriaId,
        produto_id: produtoSelecionado.id,
        codprod: produtoSelecionado.codprod,
        codbarra: produtoSelecionado.codbarra,
        tem_estoque_gondola: temEstoque,
        motivo_ruptura: motivo,
        preco_gondola: produtoSelecionado.pvenda
      });

      setProdutoSelecionado(null);
      setBuscaProduto('');
      setProdutosSugeridos([]);
      carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleFinalizar = async () => {
    if (!confirm('Deseja concluir a auditoria e gerar o relatório de reposição?')) return;
    try {
      await rupturaService.finalizarAuditoria(auditoriaId);
      carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  if (carregando || !auditoria) {
    return <div className="p-8 text-center text-xs font-black uppercase text-[#09797a] animate-pulse">Carregando auditoria...</div>;
  }

  const isFinalizada = auditoria.status === 'Concluída';
  const totalOperacional = itens.filter((i) => i.tipo_ruptura === 'OPERACIONAL').length;
  const totalComercial = itens.filter((i) => i.tipo_ruptura === 'COMERCIAL').length;

  return (
    <div className="flex flex-col gap-4 animate-fadeIn font-sans">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onVoltar}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer active:scale-95"
          >
            ←
          </button>
          <div>
            <span className="font-mono text-xs font-black text-[#09797a]">
              #{auditoria.codigo_customizado}
            </span>
            <h2 className="text-sm font-black text-slate-900 uppercase">
              {auditoria.setor_nome} {auditoria.rua_corredor ? `• ${auditoria.rua_corredor}` : ''}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isFinalizada && (
            <button
              type="button"
              onClick={handleFinalizar}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 cursor-pointer"
            >
              Concluir Auditoria ✓
            </button>
          )}
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
            isFinalizada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
          }`}>
            {auditoria.status}
          </span>
        </div>
      </div>

      {/* CARDS DE INDICADORES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Total Auditados</span>
          <span className="text-xl font-black text-slate-800">{auditoria.total_itens_auditados}</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-amber-800 block">Rup. Operacional</span>
          <span className="text-xl font-black text-amber-900">{totalOperacional}</span>
          <span className="text-[9px] text-amber-700 font-bold block">Tem no depósito</span>
        </div>
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-rose-600 block">Rup. Comercial</span>
          <span className="text-xl font-black text-rose-800">{totalComercial}</span>
          <span className="text-[9px] text-rose-600 font-bold block">Sem entrada recente</span>
        </div>
        <div className="bg-teal-50 border border-teal-200 p-3 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-[#09797a] block">Presença Real</span>
          <span className="text-xl font-black text-[#09797a]">
            {auditoria.total_itens_auditados > 0
              ? `${Math.round(((auditoria.total_itens_auditados - auditoria.total_rupturas) / auditoria.total_itens_auditados) * 100)}%`
              : '100%'}
          </span>
        </div>
      </div>

      {/* ÁREA DE VARREDURA: INPUT + BOTÃO DE CÂMARA */}
      {!isFinalizada && (
        <div className="bg-white border-2 border-slate-200 p-4 rounded-3xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-800">
              Varredura de Gôndola (Bipagem / Busca)
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              Leitura Rápida
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Digite código de barras, codprod ou descrição..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
              />

              {produtosSugeridos.length > 0 && !produtoSelecionado && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto">
                  {produtosSugeridos.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setProdutoSelecionado(prod);
                        setBuscaProduto(`${prod.codprod} - ${prod.descricao}`);
                        setProdutosSugeridos([]);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer text-xs"
                    >
                      <span className="font-bold text-slate-800 block">{prod.descricao}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Cód: {prod.codprod} | Barra: {prod.codbarra || 'S/N'} | R$ {Number(prod.pvenda || 0).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO PARA ABRIR A CÂMARA DO TELEMÓVEL */}
            <button
              type="button"
              onClick={() => setScannerAberto(true)}
              className="h-10 px-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer flex-shrink-0"
              title="Abrir Câmara para Bipar Código de Barras"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <span className="text-xs font-black uppercase hidden sm:inline">Bipar</span>
            </button>
          </div>

          {/* PAINEL DE VALIDAÇÃO DO ITEM IDENTIFICADO */}
          {produtoSelecionado && (
            <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-200 flex flex-col gap-2.5 animate-slideUp">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase">
                  {produtoSelecionado.descricao}
                </span>
                <span className="text-xs font-mono font-bold text-[#09797a]">
                  R$ {Number(produtoSelecionado.pvenda || 0).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => registrarAfericao(true)}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>✓</span> Abastecido / OK
                </button>
                <button
                  type="button"
                  onClick={() => registrarAfericao(false, 'Gôndola Vazia')}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>✕</span> Ruptura / Vazio
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABAS: ITENS AUDITADOS / NÃO EXPOSTOS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('auditados')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all ${
            abaAtiva === 'auditados' ? 'bg-[#09797a] text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Itens Auditados ({itens.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('nao_expostos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all flex items-center gap-1.5 ${
            abaAtiva === 'nao_expostos' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <span>📦</span> Entraram no ERP e Não Expostos ({naoExpostos.length})
        </button>
      </div>

      {/* ABA 1: ITENS AUDITADOS */}
      {abaAtiva === 'auditados' && (
        <div className="flex flex-col gap-2">
          {itens.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-bold">
              Nenhum produto auditado nesta sessão.
            </div>
          ) : (
            itens.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  item.tem_estoque_gondola
                    ? 'bg-white border-slate-200'
                    : item.tipo_ruptura === 'OPERACIONAL'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">
                    {item.produto?.descricao || 'Produto'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Cód: {item.produto?.codprod}
                    </span>
                    {!item.tem_estoque_gondola && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        item.tipo_ruptura === 'OPERACIONAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.tipo_ruptura === 'OPERACIONAL' ? 'Ruptura Operacional (Tem no Depósito)' : 'Ruptura Comercial (Sem Entrada)'}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                  item.tem_estoque_gondola
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-600 text-white shadow-xs'
                }`}>
                  {item.tem_estoque_gondola ? 'OK' : 'Ruptura'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 2: MERCADORIAS COM ENTRADA QUE NÃO ESTÃO NA GÔNDOLA */}
      {abaAtiva === 'nao_expostos' && (
        <div className="flex flex-col gap-2">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium">
            <strong>Lista de Reposição Imediata:</strong> Estes produtos deram entrada no sistema mas não foram registados como presentes na prateleira.
          </div>

          {naoExpostos.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-bold">
              Todos os itens com entrada recente estão presentes na gôndola!
            </div>
          ) : (
            naoExpostos.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs"
              >
                <div className="flex flex-col">
                  <strong className="text-slate-800 font-bold">{item.descricao}</strong>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Cód: {item.codprod} | Barra: {item.codbarra} | Entrada: {item.data_inicial} a {item.data_final}
                  </span>
                  <span className="text-[10px] text-teal-700 font-medium">
                    {item.departamento} • {item.secao} • {item.categoria}
                  </span>
                </div>

                <span className="px-3 py-1 bg-amber-100 text-amber-900 font-black text-[10px] rounded-xl uppercase whitespace-nowrap">
                  Buscar no Depósito
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL SCANNER DA CÂMARA */}
      {scannerAberto && (
        <BarcodeScannerModal
          onScanSuccess={handleCodigoEscaneado}
          onFechar={() => setScannerAberto(false)}
        />
      )}
    </div>
  );
}