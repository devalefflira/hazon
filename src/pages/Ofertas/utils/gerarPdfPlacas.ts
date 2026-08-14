// Arquivo: src/pages/Ofertas/utils/gerarPdfPlacas.ts
import { jsPDF } from 'jspdf';

export function gerarPdfPlacas(
  oferta: any,
  itens: any[],
  layoutImagemUrl: string | null,
  placasPorPagina: number = 2
) {
  const doc = new jsPDF('p', 'mm', 'a4'); // Folha A4 Retrato
  const larguraA4 = 210;
  const alturaA4 = 297;

  // Altura ocupada por cada placa
  const alturaPlaca = alturaA4 / placasPorPagina;

  itens.forEach((item, index) => {
    const indiceNaPagina = index % placasPorPagina;

    // Adiciona nova página quando atinge o limite da folha
    if (index > 0 && indiceNaPagina === 0) {
      doc.addPage();
    }

    const yInicio = indiceNaPagina * alturaPlaca;

    // 1. Renderiza o Fundo Gráfico do Layout
    if (layoutImagemUrl) {
      try {
        doc.addImage(layoutImagemUrl, 'PNG', 0, yInicio, larguraA4, alturaPlaca);
      } catch (e) {
        console.warn('Erro ao carregar imagem de layout:', e);
      }
    } else {
      // Borda padrão de segurança
      doc.setDrawColor(9, 121, 122);
      doc.setLineWidth(1);
      doc.rect(5, yInicio + 5, larguraA4 - 10, alturaPlaca - 10);
    }

    const prod = item.produtos || {};
    const descricaoProduto = (prod.descricao || 'PRODUTO').toUpperCase();
    const precoOferta = Number(item.preco_oferta || 0);

    // Formata o Preço (Ex: R$ 17,99)
    const precoFmt = precoOferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // ==========================================
    // 2. DESCRIÇÃO DO PRODUTO: BOLD (PESO 700)
    // ==========================================
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(26, 26, 26); // Cinza escuro quase preto

    const posDescricaoY = yInicio + alturaPlaca * 0.44;
    doc.text(descricaoProduto, larguraA4 / 2, posDescricaoY, {
      align: 'center',
      maxWidth: 170
    });

    // ========================================================
    // 3. PREÇO EM VERMELHO: EXTRA BOLD / BLACK PESADO (PESO 900)
    // ========================================================
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(44);          // Tamanho encorpado e de grande impacto
    doc.setTextColor(201, 42, 42); // Tom vermelho destaque (#c92a2a)

    // Traçado extra para engrossar ainda mais os números (efeito Extra Bold/Black 900)
    doc.setDrawColor(201, 42, 42);
    doc.setLineWidth(0.4);

    const posPrecoY = yInicio + alturaPlaca * 0.72;
    doc.text(precoFmt, larguraA4 / 2, posPrecoY, {
      align: 'center',
      renderingMode: 'fillThenStroke' // Preenche e reforça as bordas para deixar extra grossa
    });

    // Linha pontilhada separando placas na mesma folha A4
    if (indiceNaPagina < placasPorPagina - 1) {
      doc.setDrawColor(210);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(0, yInicio + alturaPlaca, larguraA4, yInicio + alturaPlaca);
      doc.setLineDashPattern([], 0);
    }
  });

  doc.save(`Placas_Oferta_${oferta.codigo_customizado}.pdf`);
}