import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioPedidos(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;
  const formalizados = dados.filter((p) => p.status === "Formalizado" || p.status === "Concluído").length;

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Pedidos Emitidos</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Formalizados</div><div class="kpi-value">${formalizados}</div></div>
  `;

  const rowsHtml = dados.map((p) => `
    <tr>
      <td><strong>${p.codigo_customizado}</strong></td>
      <td>${new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
      <td><strong>${p.fornecedores?.nome_fantasia || p.fornecedores?.razao_social || "-"}</strong></td>
      <td>${p.vendedores?.nome || "Venda Direta"}</td>
      <td>${p.comprador?.nome || "-"}</td>
      <td><span class="badge ${p.status === "Formalizado" ? "badge-success" : "badge-warning"}">${p.status}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Código Pedido</th>
          <th>Data Emissão</th>
          <th>Fornecedor</th>
          <th>Vendedor / Representante</th>
          <th>Comprador</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE PEDIDOS DE COMPRA",
    subtitulo: "Formalizações e Suprimentos Enviados aos Parceiros",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}