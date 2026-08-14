import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

export function gerarRelatorioOfertas(dados: any[], dataInicio: string, dataFim: string) {
  const total = dados.length;

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Campanhas / Ofertas</div><div class="kpi-value">${total}</div></div>
  `;

  const rowsHtml = dados.map((o) => `
    <tr>
      <td><strong>${o.codigo_customizado}</strong></td>
      <td>${o.tipo_oferta_customizado || o.tipo_oferta || "Geral"}</td>
      <td>${o.data_inicio ? new Date(o.data_inicio).toLocaleDateString("pt-BR") : "-"}</td>
      <td>${o.data_fim ? new Date(o.data_fim).toLocaleDateString("pt-BR") : "-"}</td>
      <td>${o.usuario?.nome || "-"}</td>
      <td><span class="badge badge-neutral">${o.status}</span></td>
    </tr>
  `).join("");

  const conteudoHtml = `
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Tipo Oferta</th>
          <th>Início</th>
          <th>Fim</th>
          <th>Criado Por</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  abrirPdfEmNovaAba(gerarHtmlBaseRelatorio({
    titulo: "RELATÓRIO DE OFERTAS E PROMOÇÕES",
    subtitulo: "Histórico de Encartes, Campanhas e Precificação Promocional",
    dataInicio, dataFim, kpisHtml, conteudoHtml
  }));
}