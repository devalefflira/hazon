import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioInventario(dados: any[], dataInicio: string, dataFim: string) {
  const totalItens = dados.length;
  const totalQuantidade = dados.reduce((acc, i) => acc + Number(i.quantidade_contabilizada || 0), 0);

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Registros</div><div class="kpi-value">${totalItens}</div></div>
    <div class="kpi-card"><div class="kpi-label">Qtd. Total Contada</div><div class="kpi-value">${totalQuantidade.toLocaleString("pt-BR")}</div></div>
  `;

  const rowsHtml = dados.map((item) => `
    <tr>
      <td><strong>${item.inventarios?.codigo_customizado || "-"}</strong></td>
      <td>${item.produtos?.descricao || "-"} (${item.produtos?.codprod || "-"})</td>
      <td>${item.locais_captura?.nome || "-"}</td>
      <td>${item.lote || "S/L"}</td>
      <td>${item.data_validade ? new Date(item.data_validade).toLocaleDateString("pt-BR") : "-"}</td>
      <td class="text-right"><strong>${Number(item.quantidade_contabilizada).toLocaleString("pt-BR")}</strong> ${item.produtos?.unidade || "UN"}</td>
      <td><span class="badge badge-neutral">${item.status_validade?.nome || "Regular"}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Cód. Inv</th>
          <th>Produto</th>
          <th>Local</th>
          <th>Lote</th>
          <th>Validade</th>
          <th class="text-right">Qtd Contabilizada</th>
          <th>Status Validade</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO GERENCIAL DE INVENTÁRIO",
    subtitulo: "Auditoria de Contagens e Posições Físicas",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}