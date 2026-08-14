import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioAvarias(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;
  const prejuizoTotal = dados.reduce((acc, a) => acc + (Number(a.quantidade || 0) * Number(a.preco_custo_na_perda || 0)), 0);

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Ocorrências</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Prejuízo Estimado</div><div class="kpi-value badge-danger" style="display:inline-block; font-size:14px;">R$ ${prejuizoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
  `;

  const rowsHtml = dados.map((a) => `
    <tr>
      <td>${a.codigo_customizado}</td>
      <td>${new Date(a.data_registro).toLocaleDateString("pt-BR")}</td>
      <td><strong>${a.produtos?.descricao || "-"}</strong></td>
      <td>${a.motivos_avaria?.descricao || "-"}</td>
      <td class="text-right">${a.quantidade}</td>
      <td class="text-right">R$ ${Number(a.preco_custo_na_perda).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
      <td class="text-right"><strong>R$ ${(Number(a.quantidade) * Number(a.preco_custo_na_perda)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></td>
      <td><span class="badge ${a.destinacao === "Troca" ? "badge-warning" : "badge-danger"}">${a.destinacao}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Data</th>
          <th>Produto</th>
          <th>Motivo Perda</th>
          <th class="text-right">Qtd</th>
          <th class="text-right">Custo Unit</th>
          <th class="text-right">Total Perda</th>
          <th>Destinação</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE AVARIAS E QUEBRAS",
    subtitulo: "Auditoria de Perdas Operacionais e Prejuízo por Custo",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}