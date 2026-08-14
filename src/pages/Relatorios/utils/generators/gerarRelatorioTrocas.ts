import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioTrocas(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;
  const realizadas = dados.filter((t) => t.troca_realizada).length;
  const pendentes = total - realizadas;

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Processos de Troca</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Concluídas</div><div class="kpi-value">${realizadas}</div></div>
    <div class="kpi-card"><div class="kpi-label">Pendentes</div><div class="kpi-value">${pendentes}</div></div>
  `;

  const rowsHtml = dados.map((t) => `
    <tr>
      <td><strong>${t.avarias?.codigo_customizado || "-"}</strong></td>
      <td>${t.fornecedores?.nome_fantasia || t.fornecedores?.razao_social || "Não vinculado"}</td>
      <td>${t.avarias?.produtos?.descricao || "-"}</td>
      <td>${t.previsao_troca ? new Date(t.previsao_troca).toLocaleDateString("pt-BR") : "A definir"}</td>
      <td><span class="badge ${t.troca_realizada ? "badge-success" : "badge-warning"}">${t.status}</span></td>
      <td>${t.recebido_por_usuario?.nome || "-"}</td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Cód Avaria</th>
          <th>Fornecedor</th>
          <th>Produto</th>
          <th>Previsão Troca</th>
          <th>Status</th>
          <th>Recebido Por</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE GESTÃO DE TROCAS COM FORNECEDORES",
    subtitulo: "Recuperação de Ativos e Mercadorias para Ressarcimento",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}