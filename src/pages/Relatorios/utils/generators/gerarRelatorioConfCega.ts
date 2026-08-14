import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioConfCega(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;
  const concluidas = dados.filter((c) => c.status === "Finalizada" || c.status === "Concluída").length;

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Conferências Realizadas</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Finalizadas</div><div class="kpi-value">${concluidas}</div></div>
  `;

  const rowsHtml = dados.map((c) => `
    <tr>
      <td><strong>${c.codigo_customizado}</strong></td>
      <td>${new Date(c.data_conferencia).toLocaleDateString("pt-BR")} ${c.hora_conferencia || ""}</td>
      <td>${c.numero_nota_fiscal || "S/ NF"}</td>
      <td>${c.fornecedores?.nome_fantasia || c.fornecedores?.razao_social || "Fornecedor Avulso"}</td>
      <td>${c.usuario?.nome || "-"}</td>
      <td><span class="badge badge-neutral">${c.status}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Data / Hora</th>
          <th>NF Recebida</th>
          <th>Fornecedor</th>
          <th>Conferente</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE CONFERÊNCIA CEGA DE RECEBIMENTO",
    subtitulo: "Auditoria de Entradas e Divergências de Mercadorias",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}