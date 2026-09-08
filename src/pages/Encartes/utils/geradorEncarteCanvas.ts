// src/pages/Encartes/utils/geradorEncarteCanvas.ts
import type { ProdutoAgrupadoEncarte } from '../services/encartesService';

interface GerarCanvasProps {
  titulo: string;
  periodoOferta?: string; // Ex: "Ofertas Válidas de 09/09/2026 até 12/09/2026"
  produtos: ProdutoAgrupadoEncarte[];
  templateUrl?: string | null;
  configEmpresa: any;
  estilosPersonalizados?: {
    corFundoQuadroBranco?: string;
    corFundoInfo?: string;
    corTextoDescricao?: string;
    corTextoPreco?: string;
    corTextoUnidade?: string;
    pesoDescricao?: string;
    pesoPreco?: string;
    pesoUnidade?: string;
    fonteFamilia?: string;
  };
}

export async function gerarImagemEncarteCanvas({
  periodoOferta,
  produtos,
  templateUrl,
  configEmpresa,
  estilosPersonalizados
}: GerarCanvasProps): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context indisponível');

  // Dimensão padrão (1080 x 1440)
  canvas.width = 1080;
  canvas.height = 1440;

  // 1. Template de Fundo
  if (templateUrl) {
    try {
      const imgTemplate = await carregarImagem(templateUrl);
      ctx.drawImage(imgTemplate, 0, 0, canvas.width, canvas.height);
    } catch {
      ctx.fillStyle = '#658d51';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else {
    ctx.fillStyle = '#658d51';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Faixa Verde Escura: Período de Validade da Oferta
  if (periodoOferta) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Centralizado perfeitamente dentro da faixa horizontal verde escura
    ctx.fillText(periodoOferta.toUpperCase(), canvas.width / 2, 298);
  }

  // Estilos configurados
  const corQuadroBranco = estilosPersonalizados?.corFundoQuadroBranco || '#ffffff';
  const corQuadroInfo = estilosPersonalizados?.corFundoInfo || '#fff000';
  const corDesc = estilosPersonalizados?.corTextoDescricao || '#1e293b';
  const corPreco = estilosPersonalizados?.corTextoPreco || '#000000';
  const corUnidade = estilosPersonalizados?.corTextoUnidade || '#1e293b';

  const pesoDesc = estilosPersonalizados?.pesoDescricao || 'bold';
  const pesoPreco = estilosPersonalizados?.pesoPreco || '900';
  const pesoUnidade = estilosPersonalizados?.pesoUnidade || 'bold';
  const familiaFonte = estilosPersonalizados?.fonteFamilia || configEmpresa.fonte_titulo || 'Montserrat';

  // 3. Grade Reduzida e Alinhada Dentro da Área Útil (4 x 4 = 16 itens)
  const colunas = 4;
  const linhas = 4;
  const startX = 85;
  const startY = 340;
  const cardW = 205;
  const cardH = 222;
  const gapX = 30;
  const gapY = 30;

  const totalExibir = Math.min(produtos.length, colunas * linhas);

  for (let i = 0; i < totalExibir; i++) {
    const prod = produtos[i];
    const col = i % colunas;
    const lin = Math.floor(i / colunas);

    const x = startX + col * (cardW + gapX);
    const y = startY + lin * (cardH + gapY);

    // --- BLOCO SUPERIOR: QUADRO BRANCO (FOTO) ---
    const alturaBranca = cardH * 0.64;
    ctx.fillStyle = corQuadroBranco;
    roundRect(ctx, x, y, cardW, alturaBranca, { tl: 18, tr: 18, bl: 0, br: 0 }, true, false);

    if (prod.imagem_url) {
      try {
        const imgProd = await carregarImagem(prod.imagem_url);
        const maxW = cardW - 24;
        const maxH = alturaBranca - 16;
        const ratio = Math.min(maxW / imgProd.width, maxH / imgProd.height);
        const wImg = imgProd.width * ratio;
        const hImg = imgProd.height * ratio;
        const imgX = x + (cardW - wImg) / 2;
        const imgY = y + 8 + (maxH - hImg) / 2;
        ctx.drawImage(imgProd, imgX, imgY, wImg, hImg);
      } catch {
        desenharPlaceholder(ctx, x + 8, y + 8, cardW - 16, alturaBranca - 16);
      }
    } else {
      desenharPlaceholder(ctx, x + 8, y + 8, cardW - 16, alturaBranca - 16);
    }

    // --- BLOCO INFERIOR: QUADRO AMARELO (DESCRIÇÃO + PREÇO + (UNIDADE)) ---
    const alturaAmarela = cardH - alturaBranca;
    const yAmarelo = y + alturaBranca;

    ctx.fillStyle = corQuadroInfo;
    roundRect(ctx, x, yAmarelo, cardW, alturaAmarela, { tl: 0, tr: 0, bl: 18, br: 18 }, true, false);

    // Descrição limpa do produto
    ctx.fillStyle = corDesc;
    ctx.font = `${pesoDesc} 13px ${familiaFonte}, sans-serif`;
    ctx.textAlign = 'left';
    const nomeLimpo = limparDescricaoProduto(prod.descricao_base);
    const descTrun = truncarTexto(ctx, nomeLimpo, cardW - 16);
    ctx.fillText(descTrun.toUpperCase(), x + 9, yAmarelo + 21);

    // Preço e Unidade entre parênteses: R$ 1,99 (KG)
    ctx.fillStyle = corPreco;
    ctx.font = `${pesoPreco} 22px ${familiaFonte}, sans-serif`;
    const textoPreco = `R$ ${prod.preco_oferta.toFixed(2).replace('.', ',')}`;
    ctx.fillText(textoPreco, x + 9, yAmarelo + 54);

    const larguraPreco = ctx.measureText(textoPreco).width;
    ctx.fillStyle = corUnidade;
    ctx.font = `${pesoUnidade} 11.5px ${familiaFonte}, sans-serif`;
    const siglaUnidade = `(${ (prod.unidade || 'UN').toUpperCase() })`;
    ctx.fillText(siglaUnidade, x + 15 + larguraPreco, yAmarelo + 53);
  }

  return canvas.toDataURL('image/png', 1.0);
}

function limparDescricaoProduto(texto: string): string {
  if (!texto) return 'PRODUTO';

  const limpo = texto
    .replace(/\b(kg|flv|agranel|granel|pct|pcte|pacote|cx|caixa|und|unid|unidade|bd|bandeja|acg)\b/gi, '')
    .replace(/[\/\\#,+()$~%.'":*?<>{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return limpo || texto;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function desenharPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('SEM FOTO', x + w / 2, y + h / 2 + 4);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: { tl: number; tr: number; bl: number; br: number },
  fill: boolean,
  stroke: boolean
) {
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function truncarTexto(ctx: CanvasRenderingContext2D, texto: string, maxW: number): string {
  if (ctx.measureText(texto).width <= maxW) return texto;
  let cur = texto;
  while (cur.length > 0 && ctx.measureText(cur + '...').width > maxW) {
    cur = cur.slice(0, -1);
  }
  return cur + '...';
}