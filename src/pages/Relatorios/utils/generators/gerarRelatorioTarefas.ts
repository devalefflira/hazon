import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioTarefas(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;
  const concluidas = dados.filter((t) => t.status === "Concluída" || t.status === "Finalizada").length;
  const tempoTotalMin = dados.reduce((acc, t) => acc + Number(t.tempo_gasto_minutos || 0), 0);

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Total Tarefas</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Concluídas</div><div class="kpi-value">${concluidas}</div></div>
    <div class="kpi-card"><div class="kpi-label">Tempo Total (Horas)</div><div class="kpi-value">${(tempoTotalMin / 60).toFixed(1)} h</div></div>
  `;

  const rowsHtml = dados.map((t) => `
    <tr>
      <td>${t.tipo_tarefa}</td>
      <td><strong>${t.descricao}</strong></td>
      <td>${t.responsavel?.nome || "-"}</td>
      <td>${new Date(t.prazo_entrega_planejado).toLocaleDateString("pt-BR")}</td>
      <td>${t.tempo_gasto_minutos || 0} min</td>
      <td><span class="badge ${t.status === "Concluída" ? "badge-success" : "badge-warning"}">${t.status}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Descrição da Tarefa</th>
          <th>Responsável</th>
          <th>Prazo</th>
          <th>Tempo Gasto</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE GESTÃO DE TAREFAS E PRODUTIVIDADE",
    subtitulo: "Acompanhamento de Atividades Operacionais e Eficiência",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}