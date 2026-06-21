// Arquivo: src/pages/Relatorios/index.tsx
import { useState } from 'react';
import { relatoriosService } from './services/relatoriosService';

interface RelatoriosProps {
  onVoltarParaHome: () => void;
}

type SubmoduloTipo = 'validade' | 'inventariados' | 'faltas' | 'cotacoes' | 'avarias' | 'pedidos' | 'manifestos';

export default function Relatorios({ onVoltarParaHome }: RelatoriosProps) {
  const [submoduloAtivo, setSubmoduloAtivo] = useState<SubmoduloTipo>('validade');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [dadosRelatorio, setDadosRelatorio] = useState<any[]>([]);
  const [relatorioGerado, setRelatorioGerado] = useState(false);

  const listaSubmodulos = [
    { id: 'validade', label: '🛡️ Controle de Validades' },
    { id: 'inventariados', label: '📊 Itens Inventariados' },
    { id: 'faltas', label: '🔍 Notas de Falta' },
    { id: 'cotacoes', label: '💼 Histórico de Cotações' },
    { id: 'avarias', label: '⚠️ Registro de Avarias' },
    { id: 'pedidos', label: '📦 Pedidos Formalizados' },
    { id: 'manifestos', label: '📄 Manifestos (Conf. Cega)' },
  ];

  const handleProcessarRelatorio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInicio || !dataFim) {
      alert('Determine o intervalo de datas.');
      return;
    }

    try {
      setLoading(true);
      setRelatorioGerado(false);
      let dados: any[] = [];

      if (submoduloAtivo === 'validade') dados = await relatoriosService.obterControleValidades(dataInicio, dataFim);
      else if (submoduloAtivo === 'inventariados') dados = await relatoriosService.obterItensInventariados(dataInicio, dataFim);
      else if (submoduloAtivo === 'faltas') dados = await relatoriosService.obterNotasFalta(dataInicio, dataFim);
      else if (submoduloAtivo === 'cotacoes') dados = await relatoriosService.obterCotacoes(dataInicio, dataFim);
      else if (submoduloAtivo === 'avarias') dados = await relatoriosService.obterAvarias(dataInicio, dataFim);
      else if (submoduloAtivo === 'pedidos') dados = await relatoriosService.obterPedidosFormalizados(dataInicio, dataFim);
      else if (submoduloAtivo === 'manifestos') dados = await relatoriosService.obterManifestosConcluidores(dataInicio, dataFim);

      setDadosRelatorio(dados);
      setRelatorioGerado(true);
    } catch (err) {
      console.error(err);
      alert('Falha ao processar os dados analíticos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDispararImpressao = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center">
      
      {/* PAINEL DE FILTROS E SELEÇÃO (OCULTADO NA IMPRESSÃO PELO CSS 'print:hidden') */}
      <div className="w-full max-w-4xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 print:hidden mb-5">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Relatórios Gerenciais</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Suporte à Auditoria e Tomada de Decisão</p>
            </div>
          </div>
        </div>

        {/* FORMULÁRIO OPERACIONAL */}
        <form onSubmit={handleProcessarRelatorio} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-gray-50 p-4 rounded-3xl border border-gray-200">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Selecione o Submódulo Analítico</label>
            <select
              value={submoduloAtivo}
              onChange={(e) => { setSubmoduloAtivo(e.target.value as SubmoduloTipo); setRelatorioGerado(false); }}
              className="w-full h-11 text-xs bg-white border border-gray-200 px-3 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
            >
              {listaSubmodulos.map(s => <option key={s.id} value={s.id}>{s.label.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Data Inicial</label>
            <input
              type="date"
              required
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setRelatorioGerado(false); }}
              className="w-full h-11 text-xs bg-white border border-gray-200 px-4 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Data Final</label>
            <input
              type="date"
              required
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setRelatorioGerado(false); }}
              className="w-full h-11 text-xs bg-white border border-gray-200 px-4 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:col-span-4 bg-[#09797a] text-white py-3.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? 'Processando Base Relacional...' : 'Gerar Relatório A4'}
          </button>
        </form>
      </div>

      {/* 📄 FOLHA DE IMPRESSÃO MODELO A4 (DINÂMICA) */}
      {relatorioGerado && (
        <div className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[15mm] flex flex-col border border-gray-300 rounded-sm relative text-black select-text overflow-x-auto">
          
          {/* BOTÃO FLUTUANTE DE EXPORTAÇÃO (SÓ EXIBE NA TELA, DESAPARECE NO PDF) */}
          <button
            onClick={handleDispararImpressao}
            className="absolute top-4 right-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-all print:hidden"
          >
            🖨️ Exportar PDF / Imprimir
          </button>

          {/* CABEÇALHO OFICIAL DO DOCUMENTO A4 */}
          <div className="flex justify-between items-start border-b-2 border-[#09797a] pb-4 mb-6 w-full">
            <div>
              <h2 className="text-[#09797a] text-xl font-black tracking-tight uppercase">HAZON ERP</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Módulo de Governança e Inteligência Analítica</p>
            </div>
            <div className="text-right text-[10px] font-mono text-gray-500">
              <div>Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
              <div>Período: {new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
              <div className="font-bold text-[#09797a] mt-0.5">RELATÓRIO: {listaSubmodulos.find(s => s.id === submoduloAtivo)?.label.substring(3).toUpperCase()}</div>
            </div>
          </div>

          {/* CORPO DO DOCUMENTO - CONTEÚDO DE ACORDO COM A ABA */}
          <div className="flex-1 w-full">
            {dadosRelatorio.length === 0 ? (
              <p className="text-center text-gray-400 text-xs font-bold py-20 uppercase tracking-widest border border-dashed border-gray-200 rounded-3xl">Nenhum registro encontrado no cruzamento deste período.</p>
            ) : (
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b-2 border-gray-300 text-gray-700 font-black uppercase bg-gray-50">
                    {submoduloAtivo === 'validade' && (
                      <>
                        <th className="py-2 px-1">EAN / Produto</th>
                        <th className="py-2 px-1">Lote</th>
                        <th className="py-2 px-1">Validade</th>
                        <th className="py-2 px-1">Captura</th>
                        <th className="py-2 px-1 text-right">Qtd</th>
                        <th className="py-2 px-1 text-right">Status (Dias)</th>
                      </>
                    )}
                    {submoduloAtivo === 'inventariados' && (
                      <>
                        <th className="py-2 px-1">Inventário</th>
                        <th className="py-2 px-1">Produto (EAN)</th>
                        <th className="py-2 px-1">Local</th>
                        <th className="py-2 px-1 text-right">Qtd</th>
                        <th className="py-2 px-1">Data / Hora</th>
                        <th className="py-2 px-1">Conferente</th>
                      </>
                    )}
                    {submoduloAtivo === 'faltas' && (
                      <>
                        <th className="py-2 px-1">Cód</th>
                        <th className="py-2 px-1">Produto</th>
                        <th className="py-2 px-1">Setor / Subsetor</th>
                        <th className="py-2 px-1">Motivo</th>
                        <th className="py-2 px-1">Status Cotação</th>
                        <th className="py-2 px-1">Data</th>
                      </>
                    )}
                    {submoduloAtivo === 'cotacoes' && (
                      <>
                        <th className="py-2 px-1">ID Cotação</th>
                        <th className="py-2 px-1">Comprador</th>
                        <th className="py-2 px-1">Status</th>
                        <th className="py-2 px-1">Forn. Qtd</th>
                        <th className="py-2 px-1">Cenário Escolhido / Justificativa</th>
                      </>
                    )}
                    {submoduloAtivo === 'avarias' && (
                      <>
                        <th className="py-2 px-1">Código</th>
                        <th className="py-2 px-1">Produto / EAN</th>
                        <th className="py-2 px-1 text-right">Qtd</th>
                        <th className="py-2 px-1">Motivo</th>
                        <th className="py-2 px-1">Destinação</th>
                        <th className="py-2 px-1">Obs</th>
                      </>
                    )}
                    {submoduloAtivo === 'pedidos' && (
                      <>
                        <th className="py-2 px-1">Pedido</th>
                        <th className="py-2 px-1">Fornecedor / Vendedor</th>
                        <th className="py-2 px-1">Status</th>
                        <th className="py-2 px-1">Rastreio Origem</th>
                        <th className="py-2 px-1 text-right">Valor Total</th>
                      </>
                    )}
                    {submoduloAtivo === 'manifestos' && (
                      <>
                        <th className="py-2 px-1">Manifesto</th>
                        <th className="py-2 px-1">Nota Fiscal</th>
                        <th className="py-2 px-1">Fornecedor</th>
                        <th className="py-2 px-1 text-right">Prazo (Dias)</th>
                        <th className="py-2 px-1 text-right">Itens Diferentes</th>
                        <th className="py-2 px-1">Fechamento</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium text-gray-600 uppercase">
                  {dadosRelatorio.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 print:hover:bg-transparent">
                      {submoduloAtivo === 'validade' && (
                        <>
                          <td className="py-2 px-1 font-bold text-gray-800">{row.produto_descricao}<span className="block text-[8px] font-mono text-gray-400 font-normal">EAN: {row.codigo_barras}</span></td>
                          <td className="py-2 px-1 font-mono">{row.lote}</td>
                          <td className="py-2 px-1 font-mono">{new Date(row.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                          <td className="py-2 px-1 text-[9px]">{row.local_captura_nome}</td>
                          <td className="py-2 px-1 text-right font-bold text-[#09797a] font-mono">{row.quantidade_contabilizada}</td>
                          <td className={`py-2 px-1 text-right font-mono font-bold ${row.dias_para_vencer <= 0 ? 'text-red-600' : row.dias_para_vencer <= 15 ? 'text-orange-500' : 'text-gray-500'}`}>
                            {row.dias_para_vencer <= 0 ? `VENCIDO (${row.dias_para_vencer})` : `${row.dias_para_vencer} DIAS`}
                          </td>
                        </>
                      )}
                      {submoduloAtivo === 'inventariados' && (
                        <>
                          <td className="py-2 px-1 font-mono font-bold text-gray-700">{row.codigo_inventario}</td>
                          <td className="py-2 px-1">{row.produto_descricao}<span className="block text-[8px] font-mono text-gray-400">EAN: {row.codigo_barras}</span></td>
                          <td className="py-2 px-1 text-[9px]">{row.local_coleta_nome}</td>
                          <td className="py-2 px-1 text-right font-bold font-mono text-[#09797a]">{row.quantidade_coleta}</td>
                          <td className="py-2 px-1 font-mono text-[9px]">{new Date(row.data_coleta + 'T00:00:00').toLocaleDateString('pt-BR')} - {row.hora_coleta.substring(0,5)}</td>
                          <td className="py-2 px-1 text-gray-500 text-[9px]">{row.conferente_nome}</td>
                        </>
                      )}
                      {submoduloAtivo === 'faltas' && (
                        <>
                          <td className="py-2 px-1 font-mono font-bold">{row.codigo_customizado}</td>
                          <td className="py-2 px-1 font-bold text-gray-700">{row.produto_descricao}<span className="block text-[8px] font-mono text-gray-400">EAN: {row.codigo_barras}</span></td>
                          <td className="py-2 px-1 text-[9px] text-gray-400">{row.setor_nome} / {row.subsetor_nome}</td>
                          <td className="py-2 px-1 text-gray-500">{row.motivo_descricao}</td>
                          <td className="py-2 px-1 font-bold text-orange-600 text-[9px]">{row.status_cotacao}</td>
                          <td className="py-2 px-1 font-mono">{new Date(row.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        </>
                      )}
                      {submoduloAtivo === 'cotacoes' && (
                        <>
                          <td className="py-2 px-1 font-mono font-bold text-[#09797a]">#{row.codigo_cotacao_id}</td>
                          <td className="py-2 px-1 font-bold">{row.comprador_nome}</td>
                          <td className="py-2 px-1 font-bold text-[9px]">{row.status}</td>
                          <td className="py-2 px-1 font-mono text-center">{row.quantidade_fornecedores} Frm</td>
                          <td className="py-2 px-1 max-w-xs leading-normal">
                            <span className="block font-black text-gray-700 text-[9px]">{row.cenario_escolhido}</span>
                            <span className="text-[9px] text-gray-400 block normal-case italic mt-0.5">Obs: {row.justificativa_escolha}</span>
                          </td>
                        </>
                      )}
                      {submoduloAtivo === 'avarias' && (
                        <>
                          <td className="py-2 px-1 font-mono font-bold">{row.codigo_customizado}</td>
                          <td className="py-2 px-1">{row.produto_descricao}<span className="block text-[8px] font-mono text-gray-400">EAN: {row.codigo_barras}</span></td>
                          <td className="py-2 px-1 text-right font-mono font-bold text-red-600">{row.quantidade} {row.produto_unidade_medida}</td>
                          <td className="py-2 px-1 text-gray-500">{row.motivo_descricao}</td>
                          <td className="py-2 px-1 font-bold text-purple-700">{row.destinacao}</td>
                          <td className="py-2 px-1 max-w-xxs text-[9px] text-gray-400 normal-case italic">{row.observacao || '-'}</td>
                        </>
                      )}
                      {submoduloAtivo === 'pedidos' && (
                        <>
                          <td className="py-2 px-1 font-mono font-bold text-gray-700">{row.codigo_customizado}</td>
                          <td className="py-2 px-1">
                            <span className="font-bold text-gray-800 block">{row.fornecedor_nome}</span>
                            <span className="text-[8px] text-gray-400 block">Vend: {row.vendedor_nome}</span>
                          </td>
                          <td className="py-2 px-1 text-[9px] font-bold">{row.status}</td>
                          <td className="py-2 px-1"><span className={`inline-block text-[8px] font-black px-1.5 py-0.2 rounded border ${row.origem_pedido === 'COTAÇÃO' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>{row.origem_pedido}</span></td>
                          <td className="py-2 px-1 text-right font-mono font-bold text-[#09797a]">R$ {row.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </>
                      )}
                      {submoduloAtivo === 'manifestos' && (
                        <>
                          <td className="py-2 px-1 font-mono font-bold text-gray-700">{row.codigo_customizado}</td>
                          <td className="py-2 px-1 font-mono font-bold text-gray-800">{row.numero_nota_fiscal}</td>
                          <td className="py-2 px-1 font-bold text-gray-600">{row.fornecedor_nome}</td>
                          <td className="py-2 px-1 text-right font-mono font-bold text-[#09797a]">{row.prazo_entrega_dias} Dias</td>
                          <td className="py-2 px-1 text-center font-mono font-bold">{row.quantidade_itens_diferentes} Sku</td>
                          <td className="py-2 px-1 font-mono text-[9px] text-gray-400">{new Date(row.data_fechamento).toLocaleDateString('pt-BR')}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* RODAPÉ DO DOCUMENTO A4 */}
          <div className="border-t border-gray-200 pt-3 mt-6 text-center text-[8px] text-gray-400 font-bold font-mono uppercase tracking-widest w-full flex justify-between">
            <span>Hazon ERP - Sistema de Auditoria Interna</span>
            <span>Página 1 de 1</span>
          </div>

        </div>
      )}

      {/* ESTILO INJETADO MASTER DE IMPRESSÃO CSS PRINT */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden, #root > div > div:not(.max-w-\\[210mm\\]) {
            display: none !important;
          }
          div.min-h-screen {
            background: white !important;
            padding: 0 !important;
          }
          div.max-w-\\[210mm\\] {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-w: none !important;
          }
          @page {
            size: portrait;
            margin: 12mm;
          }
        }
      `}</style>

    </div>
  );
}