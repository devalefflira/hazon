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

    // 1. Fundo Gráfico do Layout
    if (layoutImagemUrl) {
      try {
        doc.addImage(layoutImagemUrl, 'PNG', 0, yInicio, larguraA4, alturaPlaca);
      } catch (e) {
        console.warn('Erro ao carregar imagem de layout:', e);
      }
    } else {
      doc.setDrawColor(9, 121, 122);
      doc.setLineWidth(1);
      doc.rect(5, yInicio + 5, larguraA4 - 10, alturaPlaca - 10);
    }

    const prod = item.produtos || {};
    const descricaoProduto = (prod.descricao || 'PRODUTO').toUpperCase();
    const precoOferta = Number(item.preco_oferta || 0);

    // Formata o número (ex: 2,19 ou 17,99)
    const valorNumericoFmt = precoOferta.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // ========================================================
    // 2. DESCRIÇÃO DO PRODUTO: BOLD (Tamanho proporcional)
    // ========================================================
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(23);
    doc.setTextColor(24, 39, 75); // Azul escuro / grafite (#18274b)

    const posDescricaoY = yInicio + alturaPlaca * 0.44;
    doc.text(descricaoProduto, larguraA4 / 2, posDescricaoY, {
      align: 'center',
      maxWidth: 175
    });

    // ========================================================
    // 3. CIFRÃO (R$) + VALOR NUMÉRICO GIGANTE
    // ========================================================
    const corVermelho = [225, 29, 29];   // Vermelho vibrante (#e11d1d)
    const corContorno = [130, 10, 10];   // Bordô escuro para o contorno 3D (#820a0a)

    doc.setFont('Helvetica', 'bold');

    // Configurações do bloco de preço
    const posBasePrecoY = yInicio + alturaPlaca * 0.77;

    // Largura total para centralizar o conjunto "R$ + 2,19"
    doc.setFontSize(42);
    const larguraRS = doc.getTextWidth('R$');
    
    doc.setFontSize(82); // Tamanho gigante para os números
    const larguraNumero = doc.getTextWidth(valorNumericoFmt);

    const espacamento = 6;
    const larguraConjunto = larguraRS + espacamento + larguraNumero;
    const xInicioConjunto = (larguraA4 - larguraConjunto) / 2;

    // Desenha o "R$"
    doc.setFontSize(42);
    doc.setTextColor(corVermelho[0], corVermelho[1], corVermelho[2]);
    doc.setDrawColor(corContorno[0], corContorno[1], corContorno[2]);
    doc.setLineWidth(0.6);
    doc.text('R$', xInicioConjunto, posBasePrecoY - 4, {
      renderingMode: 'fillThenStroke'
    });

    // Desenha o Número Gigante (ex: 2,19)
    doc.setFontSize(82);
    doc.setTextColor(corVermelho[0], corVermelho[1], corVermelho[2]);
    doc.setDrawColor(corContorno[0], corContorno[1], corContorno[2]);
    doc.setLineWidth(1.0); // Contorno reforçado no estilo cartaz de supermercado
    doc.text(valorNumericoFmt, xInicioConjunto + larguraRS + espacamento, posBasePrecoY, {
      renderingMode: 'fillThenStroke'
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