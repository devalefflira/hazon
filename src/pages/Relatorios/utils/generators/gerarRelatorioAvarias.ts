// src/pages/Relatorios/utils/generators/gerarRelatorioAvarias.ts
import { gerarHtmlBaseRelatorio, abrirPdfEmNovaAba } from "../pdfBaseTemplate";

interface FiltrosAvarias {
  departamento?: string;
  secao?: string;
  categoria?: string;
}

// Função para formatar YYYY-MM-DD para DD/MM/YYYY sem deslocamento de fuso horário
const formatarDataSegura = (dataStr?: string) => {
  if (!dataStr) return "-";
  const apenasData = dataStr.split("T")[0];
  const partes = apenasData.split("-");
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataStr;
};

export function gerarRelatorioAvarias(
  dados: any[],
  dataInicio: string,
  dataFim: string,
  filtros?: FiltrosAvarias
) {
  const total = dados.length;
  const prejuizoTotal = dados.reduce(
    (acc, a) => acc + Number(a.quantidade || 0) * Number(a.preco_custo_na_perda || 0),
    0
  );

  let subtitulo = "Auditoria de Perdas Operacionais e Prejuízo por Custo";
  const detalhesFiltros: string[] = [];

  if (filtros?.departamento && filtros.departamento !== "TODOS") {
    detalhesFiltros.push(`Dep: ${filtros.departamento}`);
  }
  if (filtros?.secao && filtros.secao !== "TODOS") {
    detalhesFiltros.push(`Seção: ${filtros.secao}`);
  }
  if (filtros?.categoria && filtros.categoria !== "TODOS") {
    detalhesFiltros.push(`Cat: ${filtros.categoria}`);
  }

  if (detalhesFiltros.length > 0) {
    subtitulo += ` | Filtros: ${detalhesFiltros.join(" • ")}`;
  }

  const kpisHtml = `
    <div class="kpi-card"><div class="kpi-label">Ocorrências</div><div class="kpi-value">${total}</div></div>
    <div class="kpi-card"><div class="kpi-label">Prejuízo Estimado</div><div class="kpi-value badge-danger" style="display:inline-block; font-size:14px;">R$ ${prejuizoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
  `;

  const rowsHtml = dados
    .map((a) => `
    <tr>
      <td>${a.codigo_customizado || "-"}</td>
      <td>${formatarDataSegura(a.data_registro)}</td>
      <td><strong>${a.produtos?.descricao || "-"}</strong></td>
      <td>${a.motivos_avaria?.descricao || "-"}</td>
      <td class="text-right">${a.quantidade}</td>
      <td class="text-right">R$ ${Number(a.preco_custo_na_perda || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="text-right"><strong>R$ ${(Number(a.quantidade || 0) * Number(a.preco_custo_na_perda || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
      <td><span class="badge ${a.destinacao === "Troca" ? "badge-warning" : "badge-danger"}">${a.destinacao || "Descarte"}</span></td>
    </tr>
  `)
    .join("");

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

  abrirPdfEmNovaAba(
    gerarHtmlBaseRelatorio({
      titulo: "RELATÓRIO DE AVARIAS E QUEBRAS",
      subtitulo,
      dataInicio,
      dataFim,
      kpisHtml,
      conteudoHtml,
    })
  );
}