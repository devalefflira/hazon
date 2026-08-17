// Arquivo: src/pages/Ofertas/utils/gerarPdfPlacas.ts
import { jsPDF } from 'jspdf';

// Função para unificar produtos que só mudam sabor/fragrância
function agruparItensSimilares(itens: any[]) {
  const grupos: Record<string, { descricao: string; preco_oferta: number }> = {};

  itens.forEach((item) => {
    const prod = item.produtos || {};
    const descOriginal = (prod.descricao || item.descricao || 'PRODUTO').toUpperCase().trim();
    const preco = Number(item.preco_oferta || 0);

    let chaveBase = descOriginal;

    // Regras de agrupamento por família de produtos
    if (descOriginal.includes('GELATINA') && descOriginal.includes('SALON LINE')) {
      chaveBase = 'GELATINA CAP SALON LINE 550G FRAGRÂNCIAS';
    } else if (descOriginal.includes('SUCO PROMIX')) {
      chaveBase = 'SUCO PROMIX 10L SABORES';
    } else if (descOriginal.includes('CR TRAT DABELLE') || descOriginal.includes('MASC DABELLE')) {
      chaveBase = 'CREME TRATAMENTO DABELLE 800G FRAGRÂNCIAS';
    } else if (descOriginal.includes('SABON PALMOLIVE') || descOriginal.includes('SAB PALMOLIVE')) {
      chaveBase = 'SABONETE PALMOLIVE 85G FRAGRÂNCIAS';
    } else if (descOriginal.includes('BALA ERLAN')) {
      chaveBase = 'BALA ERLAN 500G SABORES DIVERSOS';
    }

    // Chave única composta pela descrição agrupada + preço de oferta
    const chaveUnica = `${chaveBase}_${preco}`;

    if (!grupos[chaveUnica]) {
      grupos[chaveUnica] = {
        descricao: chaveBase,
        preco_oferta: preco
      };
    }
  });

  return Object.values(grupos);
}

export function gerarPdfPlacas(
  oferta: any,
  itens: any[],
  layoutImagemUrl: string | null,
  placasPorPagina: number = 2
) {
  const doc = new jsPDF('p', 'mm', 'a4'); // Folha A4 Retrato
  const larguraA4 = 210;
  const alturaA4 = 297;

  // Itens unificados por fragrância/sabor
  const itensAgrupados = agruparItensSimilares(itens);

  // Altura ocupada por cada placa
  const alturaPlaca = alturaA4 / placasPorPagina;

  itensAgrupados.forEach((item, index) => {
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

    const descricaoProduto = item.descricao.toUpperCase();
    const precoOferta = Number(item.preco_oferta || 0);

    // Formata o número (ex: 2,19 ou 17,99)
    const valorNumericoFmt = precoOferta.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // ========================================================
    // 2. DESCRIÇÃO DO PRODUTO: BOLD
    // ========================================================
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
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
    const corContorno = [130, 10, 10];   // Bordô escuro para o contorno (#820a0a)

    doc.setFont('Helvetica', 'bold');

    const posBasePrecoY = yInicio + alturaPlaca * 0.77;

    doc.setFontSize(42);
    const larguraRS = doc.getTextWidth('R$');
    
    doc.setFontSize(82);
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

    // Desenha o Número Gigante
    doc.setFontSize(82);
    doc.setTextColor(corVermelho[0], corVermelho[1], corVermelho[2]);
    doc.setDrawColor(corContorno[0], corContorno[1], corContorno[2]);
    doc.setLineWidth(1.0);
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