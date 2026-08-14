import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioCotacoes(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;
  const concluidas = dados.filter((c) => c.status === "Finalizada" || c.status === "Concluída").length;

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Total de Cotações</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Concluídas</div><div class="kpi-value">${concluidas}</div></div>
  `;

  const rowsHtml = dados.map((c) => `
    <tr>
      <td><strong>#${c.id.substring(0, 8)}</strong></td>
      <td>${new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
      <td>${c.comprador?.nome || "-"}</td>
      <td>${c.cenario_escolhido || "Não definido"}</td>
      <td>${c.justificativa_escolha || "-"}</td>
      <td><span class="badge badge-neutral">${c.status}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Cotação ID</th>
          <th>Abertura</th>
          <th>Comprador</th>
          <th>Cenário Escolhido</th>
          <th>Justificativa</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO GERENCIAL DE COTAÇÕES",
    subtitulo: "Acompanhamento de Negociações e Cenários de Compras",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}