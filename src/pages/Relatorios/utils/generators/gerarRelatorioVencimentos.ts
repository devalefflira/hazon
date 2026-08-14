// src/pages/Relatorios/utils/generators/gerarRelatorioVencimentos.ts
import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioVencimentos(dados: any[], dataInicio: string, dataFim: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const totalRegistros = dados.length;
  const totalQuantidade = dados.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);

  let totalVencidos = 0;
  let totalCriticos = 0; // Próximos 30 dias

  dados.forEach((item) => {
    if (item.data_validade) {
      const dtVal = new Date(item.data_validade);
      dtVal.setHours(0, 0, 0, 0);
      const diffDias = Math.ceil((dtVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDias < 0) {
        totalVencidos++;
      } else if (diffDias <= 30) {
        totalCriticos++;
      }
    }
  });

  const kpisHtml = `
    <div class="kpi-card">
      <div class="kpi-label">Lotes Monitorados</div>
      <div class="kpi-value">${totalRegistros}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Qtd Total em Estoque</div>
      <div class="kpi-value">${totalQuantidade.toLocaleString("pt-BR")}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Lotes Vencidos</div>
      <div class="kpi-value" style="color: #dc2626;">${totalVencidos}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Críticos (≤ 30 Dias)</div>
      <div class="kpi-value" style="color: #d97706;">${totalCriticos}</div>
    </div>
  `;

  const rowsHtml = dados.map((item) => {
    let statusBadge = `<span class="badge badge-success">No Prazo</span>`;
    let diasRestantes = "-";

    if (item.data_validade) {
      const dtVal = new Date(item.data_validade);
      dtVal.setHours(0, 0, 0, 0);
      const diff = Math.ceil((dtVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diff < 0) {
        statusBadge = `<span class="badge badge-danger">VENCIDO (${Math.abs(diff)}d atrás)</span>`;
        diasRestantes = `<span style="color:#dc2626; font-weight:bold;">${diff}d</span>`;
      } else if (diff <= 30) {
        statusBadge = `<span class="badge badge-warning">ALERTA (${diff}d restantes)</span>`;
        diasRestantes = `<span style="color:#d97706; font-weight:bold;">${diff}d</span>`;
      } else {
        diasRestantes = `${diff}d`;
      }
    }

    return `
      <tr>
        <td><strong>${item.codigo_customizado || "-"}</strong></td>
        <td><strong>${item.produtos?.descricao || "-"}</strong> (${item.produtos?.codprod || "-"})</td>
        <td>${item.lote || "S/L"}</td>
        <td>${item.data_validade ? new Date(item.data_validade).toLocaleDateString("pt-BR") : "-"}</td>
        <td class="text-center">${diasRestantes}</td>
        <td class="text-right"><strong>${Number(item.quantidade).toLocaleString("pt-BR")}</strong> ${item.produtos?.unidade || "UN"}</td>
        <td>${item.origem || "Vencimentos"}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Produto</th>
          <th>Lote</th>
          <th>Data Validade</th>
          <th class="text-center">Janela</th>
          <th class="text-right">Qtd Registrada</th>
          <th>Origem</th>
          <th>Status Risco</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE CONTROLE DE VALIDADES E VENCIMENTOS",
    subtitulo: "Auditoria Preventiva de Perdas e Gestão de Prazos de Validade",
    dataInicio,
    dataFim,
    kpisHtml,
    conteudoHtml
  }));
}