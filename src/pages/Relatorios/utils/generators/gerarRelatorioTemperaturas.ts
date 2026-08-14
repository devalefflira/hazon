import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioTemperaturas(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;
  const naoConformes = dados.filter((t) => t.status_resultado === "Não Conforme" || t.status_resultado === "Crítico").length;
  const conformes = total - naoConformes;

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Aferições</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Conformes</div><div class="kpi-value">${conformes}</div></div>
    <div class="kpi-card"><div class="kpi-label">Não Conformes</div><div class="kpi-value badge-danger" style="display:inline-block; font-size:14px;">${naoConformes}</div></div>
  `;

  const rowsHtml = dados.map((t) => `
    <tr>
      <td>${t.codigo_customizado}</td>
      <td>${new Date(t.data_registro).toLocaleDateString("pt-BR")} ${t.hora_registro || ""}</td>
      <td><strong>${t.temperatura_equipamentos?.nome || "-"}</strong> (${t.temperatura_equipamentos?.tipo_item})</td>
      <td>${t.usuario?.nome || "-"}</td>
      <td class="text-right"><strong>${t.temperatura_aferida} °C</strong></td>
      <td><span class="badge ${t.status_resultado === "Conforme" ? "badge-success" : "badge-danger"}">${t.status_resultado}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Data / Hora</th>
          <th>Equipamento</th>
          <th>Responsável</th>
          <th class="text-right">Temp. Aferida</th>
          <th>Status Auditoria</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE MONITORAMENTO DE TEMPERATURAS",
    subtitulo: "Controle da Cadeia de Frio e Conformidade Sanitária",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}