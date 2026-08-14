import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioOrcamentos(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;
  const valorTotal = dados.reduce((acc, o) => acc + Number(o.valor_total || 0), 0);
  const ticketMedio = total > 0 ? valorTotal / total : 0;

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Orçamentos</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Volume Total</div><div class="kpi-value">R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
    <div class="kpi-card"><div class="kpi-label">Ticket Médio</div><div class="kpi-value">R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
  `;

  const rowsHtml = dados.map((o) => `
    <tr>
      <td><strong>${o.codigo_customizado}</strong></td>
      <td>${new Date(o.data_registro).toLocaleDateString("pt-BR")}</td>
      <td><strong>${o.cliente_nome}</strong></td>
      <td>${o.cidade} - ${o.estado}</td>
      <td>${o.contato_whatsapp || "-"}</td>
      <td class="text-right"><strong>R$ ${Number(o.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></td>
      <td><span class="badge ${o.status === "Aprovado" ? "badge-success" : "badge-neutral"}">${o.status}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Data</th>
          <th>Cliente</th>
          <th>Praça</th>
          <th>Contato</th>
          <th class="text-right">Valor Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO COMERCIAL DE ORÇAMENTOS",
    subtitulo: "Desempenho de Vendas e Propostas Comerciais",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}