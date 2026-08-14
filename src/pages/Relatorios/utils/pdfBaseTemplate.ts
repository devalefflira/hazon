// src/pages/Relatorios/utils/pdfBaseTemplate.ts

interface BaseTemplateOptions {
  titulo: string;
  subtitulo?: string;
  dataInicio: string;
  dataFim: string;
  kpisHtml: string;
  conteudoHtml: string;
}

export function gerarHtmlBaseRelatorio({
  titulo,
  subtitulo = "Suporte à Auditoria e Tomada de Decisão",
  dataInicio,
  dataFim,
  kpisHtml,
  conteudoHtml,
}: BaseTemplateOptions): string {
  const dataEmissao = new Date().toLocaleString("pt-BR");

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${titulo} - Hazon ERP</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 12mm 15mm;
      }
      * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
      }
      body {
        margin: 0;
        padding: 0;
        font-size: 11px;
        line-height: 1.4;
        background-color: #fff;
      }
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0f766e;
        padding-bottom: 10px;
        margin-bottom: 14px;
      }
      .logo-title {
        font-size: 18px;
        font-weight: 800;
        color: #0f766e;
        letter-spacing: -0.5px;
      }
      .report-title {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        margin-top: 2px;
      }
      .report-subtitle {
        font-size: 10px;
        color: #64748b;
      }
      .meta-info {
        text-align: right;
        font-size: 10px;
        color: #475569;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 16px;
      }
      .kpi-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 12px;
      }
      .kpi-label {
        font-size: 9px;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 600;
      }
      .kpi-value {
        font-size: 15px;
        font-weight: 700;
        color: #0f766e;
        margin-top: 2px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      th {
        background-color: #0f766e;
        color: #ffffff;
        font-weight: 600;
        text-align: left;
        padding: 6px 8px;
        font-size: 10px;
        text-transform: uppercase;
      }
      td {
        padding: 6px 8px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 10px;
      }
      tr:nth-child(even) td {
        background-color: #f8fafc;
      }
      .badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 600;
      }
      .badge-success { background: #dcfce7; color: #166534; }
      .badge-danger { background: #fee2e2; color: #991b1b; }
      .badge-warning { background: #fef3c7; color: #92400e; }
      .badge-neutral { background: #f1f5f9; color: #475569; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .footer {
        margin-top: 20px;
        border-top: 1px solid #cbd5e1;
        padding-top: 6px;
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #94a3b8;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <div class="header-container">
      <div>
        <div class="logo-title">HAZON ERP</div>
        <div class="report-title">${titulo}</div>
        <div class="report-subtitle">${subtitulo}</div>
      </div>
      <div class="meta-info">
        <div><strong>Período:</strong> ${dataInicio} até ${dataFim}</div>
        <div><strong>Emissão:</strong> ${dataEmissao}</div>
      </div>
    </div>

    ${kpisHtml ? `<div class="kpi-grid">${kpisHtml}</div>` : ""}

    <div class="content-body">
      ${conteudoHtml}
    </div>

    <div class="footer">
      <span>Hazon ERP • Sistema de Gestão e Inteligência Operacional</span>
      <span>Relatório Gerencial</span>
    </div>

    <script>
      window.onload = () => {
        window.print();
      };
    </script>
  </body>
  </html>
  `;
}

export function abrirPdfEmNovaAba(htmlContent: string) {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}