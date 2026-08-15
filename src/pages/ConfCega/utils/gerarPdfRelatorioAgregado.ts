// src/pages/ConfCega/utils/gerarPdfRelatorioAgregado.ts
import type { ConferenciaRegistro } from "../types/conferencias.types";

export function gerarPdfRelatorioAgregado(conferencias: ConferenciaRegistro[]) {
  const dataEmissaoRelatorio = new Date().toLocaleString("pt-BR");
  
  // Agrupa os números das notas e fornecedores para o cabeçalho
  const listaNotas = conferencias.map(c => `#${c.numero_nota_fiscal}`).join(", ");
  const totalPecas = conferencias.reduce((acc, c) => {
    return acc + (c.conferencia_itens?.reduce((subAcc, i) => subAcc + Number(i.quantidade_contada || 0), 0) || 0);
  }, 0);

  // Monta as linhas da tabela unificada com a referência de qual NF pertence o item
  const rows = conferencias.flatMap(conf => 
    (conf.conferencia_itens || []).map(it => `
      <tr>
        <td><strong>NF #${conf.numero_nota_fiscal}</strong></td>
        <td><strong>${it.produto?.codprod || "-"}</strong></td>
        <td>${it.produto?.codbarra || "-"}</td>
        <td>${it.produto?.descricao || "-"}</td>
        <td style="text-align: right; font-weight: bold; color: #0f766e;">${it.quantidade_contada} UN</td>
        <td>${it.lote || "-"}</td>
        <td>${it.data_validade ? new Date(it.data_validade).toLocaleDateString("pt-BR") : "-"}</td>
        <td>${conf.usuario?.nome || "-"}</td>
      </tr>
    `)
  ).join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Relatório Agregado de Recebimento</title>
    <style>
      @page { size: A4 portrait; margin: 12mm 15mm; }
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; }
      body { margin: 0; padding: 0; font-size: 10px; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; }
      .title { font-size: 16px; font-weight: 800; color: #0f766e; }
      .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
      .meta { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 5px; }
      th { background: #0f766e; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; }
      td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9px; }
      tr:nth-child(even) td { background: #f8fafc; }
      .kpi-container { display: flex; justify-content: space-between; margin-top: 15px; border-top: 2px solid #cbd5e1; padding-top: 8px; font-size: 11px; font-weight: bold; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">HAZON ERP — RELATÓRIO AGREGADO DE RECEBIMENTO</div>
      <div class="subtitle">Consolidado de Conferência Cega das Notas Selecionadas</div>
    </div>

    <div class="meta">
      <div>
        <div><strong>Notas Selecionadas (${conferencias.length}):</strong> ${listaNotas}</div>
      </div>
      <div style="text-align: right;">
        <div><strong>Emissão:</strong> ${dataEmissaoRelatorio}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nota</th>
          <th>Cód</th>
          <th>Cód Barras</th>
          <th>Descrição do Produto</th>
          <th style="text-align: right;">Qtd Recebida</th>
          <th>Lote</th>
          <th>Validade</th>
          <th>Conferente</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="kpi-container">
      <span>Total de Notas Agregadas: ${conferencias.length}</span>
      <span style="color: #0f766e;">Volume Total Contado: ${totalPecas.toLocaleString("pt-BR")} UN</span>
    </div>

    <script>
      window.onload = () => { window.print(); };
    </script>
  </body>
  </html>
  `;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}