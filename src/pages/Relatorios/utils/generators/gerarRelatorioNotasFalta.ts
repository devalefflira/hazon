import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioNotasFalta(dados: any[], dataInicio: string, dataFim: string) {
  const totalFaltas = dados.length;
  const pendentes = dados.filter((d) => d.status_cotacao === "Pendente").length;
  const emCotacao = dados.filter((d) => d.status_cotacao !== "Pendente").length;

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Total de Faltas</div><div class="kpi-value">${totalFaltas}</div></div>
    <div class="kpi-card"><div class="kpi-label">Pendentes</div><div class="kpi-value text-red-600">${pendentes}</div></div>
    <div class="kpi-card"><div class="kpi-label">Em Cotação</div><div class="kpi-value">${emCotacao}</div></div>
  `;

  const rowsHtml = dados.map((item) => `
    <tr>
      <td>${item.codigo_customizado}</td>
      <td>${new Date(item.data_registro).toLocaleDateString("pt-BR")} ${item.hora_registro || ""}</td>
      <td><strong>${item.produtos?.descricao || "-"}</strong> (${item.produtos?.codprod})</td>
      <td>${item.setor_nome || "-"}</td>
      <td>${item.motivos_falta?.descricao || "-"}</td>
      <td class="text-right">${item.quantidade_restante} ${item.unidade_restante}</td>
      <td><span class="badge ${item.status_cotacao === "Pendente" ? "badge-danger" : "badge-success"}">${item.status_cotacao}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Data / Hora</th>
          <th>Produto</th>
          <th>Setor</th>
          <th>Motivo Falta</th>
          <th class="text-right">Qtd Restante</th>
          <th>Status Cotação</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE RUPTURAS E NOTAS DE FALTA",
    subtitulo: "Análise de Faltas de Produtos na Área de Venda e Depósito",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}