// src/pages/Encartes/utils/geradorEncarteCanvas.ts
import type { ProdutoAgrupadoEncarte } from '../services/encartesService';

interface GerarCanvasProps {
  titulo: string;
  produtos: ProdutoAgrupadoEncarte[];
  templateUrl?: string | null;
  configEmpresa: any;
}

export async function gerarImagemEncarteCanvas({
  titulo,
  produtos,
  templateUrl,
  configEmpresa
}: GerarCanvasProps): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context indisponível');

  // Dimensão padrão Story / Feed Vertical HD (1080 x 1920)
  canvas.width = 1080;
  canvas.height = 1920;

  // 1. Fundo Base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Imagem de Fundo / Template
  if (templateUrl) {
    try {
      const imgTemplate = await carregarImagem(templateUrl);
      ctx.drawImage(imgTemplate, 0, 0, canvas.width, canvas.height);
    } catch {
      desenharCabecalhoPadrao(ctx, titulo, configEmpresa);
    }
  } else {
    desenharCabecalhoPadrao(ctx, titulo, configEmpresa);
  }

  // 3. Logo da Empresa no Topo
  if (configEmpresa?.logo_url) {
    try {
      const imgLogo = await carregarImagem(configEmpresa.logo_url);
      const logoW = 180;
      const logoH = (imgLogo.height / imgLogo.width) * logoW;
      ctx.drawImage(imgLogo, 40, 40, logoW, Math.min(logoH, 120));
    } catch (e) {
      console.warn('Erro ao carregar logo no encarte:', e);
    }
  }

  // 4. Grade de Produtos Dinâmica (3 colunas)
  const totalProdutos = produtos.length;
  const colunas = totalProdutos > 6 ? 3 : 2;
  const areaYInicio = 340;
  const areaYFim = 1750;
  const alturaDisponivel = areaYFim - areaYInicio;

  const linhas = Math.ceil(totalProdutos / colunas) || 1;
  const cardLargura = (canvas.width - 60 - (colunas - 1) * 20) / colunas;
  const cardAltura = Math.min(320, (alturaDisponivel - (linhas - 1) * 20) / linhas);

  for (let i = 0; i < totalProdutos; i++) {
    const prod = produtos[i];
    const col = i % colunas;
    const lin = Math.floor(i / colunas);

    const x = 30 + col * (cardLargura + 20);
    const y = areaYInicio + lin * (cardAltura + 20);

    if (y + cardAltura > areaYFim) break; // Limite de altura

    // Fundo do Card do Produto
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, cardLargura, cardAltura, 18, true, false);

    // Sombra sutil
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cardLargura, cardAltura, 18, false, true);

    // Foto do Produto
    const fotoH = cardAltura * 0.45;
    if (prod.imagem_url) {
      try {
        const imgProd = await carregarImagem(prod.imagem_url);
        ctx.drawImage(imgProd, x + 15, y + 15, cardLargura - 30, fotoH - 10);
      } catch {
        desenharPlaceholderFoto(ctx, x + 15, y + 15, cardLargura - 30, fotoH - 10);
      }
    } else {
      desenharPlaceholderFoto(ctx, x + 15, y + 15, cardLargura - 30, fotoH - 10);
    }

    // Título do Produto
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${colunas === 3 ? 18 : 22}px ${configEmpresa.fonte_titulo || 'Montserrat'}, sans-serif`;
    ctx.textAlign = 'left';
    const descTrun = truncarTexto(ctx, prod.descricao_base || 'PRODUTO', cardLargura - 30);
    ctx.fillText(descTrun.toUpperCase(), x + 15, y + fotoH + 30);

    // Sabores/Variantes (se houver)
    if (prod.variacoes && prod.variacoes.length > 1) {
      ctx.fillStyle = '#09797a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${prod.variacoes.length} TIPOS / SABORES`, x + 15, y + fotoH + 48);
    }

    // Preço Tabela (Riscado)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    const precoTabTexto = `R$ ${prod.preco_tabela.toFixed(2)}`;
    ctx.fillText(precoTabTexto, x + 15, y + cardAltura - 38);
    ctx.fillRect(x + 15, y + cardAltura - 43, ctx.measureText(precoTabTexto).width, 1.5);

    // Preço de Oferta em Destaque
    ctx.fillStyle = '#047857';
    ctx.font = `900 ${colunas === 3 ? 32 : 38}px ${configEmpresa.fonte_preco || 'Montserrat'}, sans-serif`;
    ctx.fillText(`R$ ${prod.preco_oferta.toFixed(2)}`, x + 15, y + cardAltura - 12);
  }

  // 5. Rodapé Informativo da Empresa
  ctx.fillStyle = '#09797a';
  ctx.fillRect(0, 1820, canvas.width, 100);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px sans-serif';

  const dadosRodape: string[] = [];
  if (configEmpresa.mostrar_nome_empresa && configEmpresa.nome_empresa) dadosRodape.push(configEmpresa.nome_empresa);
  if (configEmpresa.mostrar_whatsapp && configEmpresa.whatsapp) dadosRodape.push(`WhatsApp: ${configEmpresa.whatsapp}`);
  if (configEmpresa.mostrar_instagram && configEmpresa.instagram) dadosRodape.push(`@${configEmpresa.instagram}`);

  ctx.fillText(dadosRodape.join(' • '), canvas.width / 2, 1860);

  if (configEmpresa.mostrar_formas_pagamento && configEmpresa.formas_pagamento) {
    ctx.font = 'normal 13px sans-serif';
    ctx.fillStyle = '#99f6e4';
    ctx.fillText(configEmpresa.formas_pagamento, canvas.width / 2, 1885);
  }

  return canvas.toDataURL('image/png', 1.0);
}

// Helpers do Canvas
function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function desenharCabecalhoPadrao(ctx: CanvasRenderingContext2D, titulo: string, config: any) {
  ctx.fillStyle = '#09797a';
  ctx.fillRect(0, 0, 1080, 280);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '900 48px sans-serif';
  ctx.fillText(titulo.toUpperCase(), 540, 160);

  if (config.slogan && config.mostrar_slogan) {
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#99f6e4';
    ctx.fillText(config.slogan.toUpperCase(), 540, 205);
  }
}

function desenharPlaceholderFoto(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('SEM FOTO', x + w / 2, y + h / 2 + 4);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean, stroke: boolean) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
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