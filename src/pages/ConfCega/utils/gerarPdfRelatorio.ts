import type { ConferenciaRegistro } from "../types/conferencias.types";

export function gerarPdfRelatorioConferencia(conf: ConferenciaRegistro) {
  const rows = conf.conferencia_itens?.map((it) => `
    <tr>
      <td><strong>${it.produto?.codprod || "-"}</strong></td>
      <td>${it.produto?.codbarra || "-"}</td>
      <td>${it.produto?.descricao || "-"}</td>
      <td style="text-align: right; font-weight: bold;">${it.quantidade_contada} UN</td>
      <td>${it.lote || "-"}</td>
      <td>${it.data_validade ? new Date(it.data_validade).toLocaleDateString("pt-BR") : "-"}</td>
    </tr>
  `).join("") || "";

  const totalContado = conf.conferencia_itens?.reduce((acc, i) => acc + Number(i.quantidade_contada || 0), 0) || 0;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Conferência Cega - NF ${conf.numero_nota_fiscal}</title>
    <style>
      @page { size: A4 portrait; margin: 15mm; }
      body { font-family: sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
      .header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 15px; }
      .title { font-size: 16px; font-weight: bold; color: #0f766e; }
      .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #0f766e; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
      td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
      tr:nth-child(even) td { background: #f8fafc; }
      .total-box { margin-top: 15px; text-align: right; font-size: 12px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">HAZON ERP — RELATÓRIO DE CONFERÊNCIA CEGA</div>
      <div>Auditoria de Entrada e Recebimento de Mercadorias</div>
    </div>

    <div class="meta">
      <div><strong>Código:</strong> ${conf.codigo_customizado}</div>
      <div><strong>NF:</strong> ${conf.numero_nota_fiscal}</div>
      <div><strong>Emissão NF:</strong> ${new Date(conf.data_emissao_nota).toLocaleDateString("pt-BR")}</div>
      <div><strong>Fornecedor:</strong> ${conf.fornecedor?.razao_social || "-"}</div>
      <div><strong>CNPJ:</strong> ${conf.fornecedor?.cnpj || "-"}</div>
      <div><strong>Conferente:</strong> ${conf.usuario?.nome || "-"}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Cód</th>
          <th>Cód Barras</th>
          <th>Descrição do Produto</th>
          <th style="text-align: right;">Qtd Contada</th>
          <th>Lote</th>
          <th>Validade</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="total-box">
      Total de Peças Contadas: ${totalContado} UN
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