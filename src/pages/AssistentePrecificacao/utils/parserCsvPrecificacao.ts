// src/pages/AssistentePrecificacao/utils/parserCsvPrecificacao.ts
import type { ItemImportado, ResultadoImportacaoCsv } from '../types/precificacao.types';

const REGEX_DATAHORA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_INT = /^\d+$/;
const REGEX_DECIMAL_PARTE = /^\d{1,4}$/;
const REGEX_NUMERICO_OU_DATA = /^[\d.\-]+$/;

/**
 * Decodifica o arquivo: tenta UTF-8 e, se falhar, usa Windows-1252
 * (exportações de ERP legado costumam sair nesse formato).
 */
export function decodificarArquivoCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

const limpar = (valor: string): string => valor.trim().replace(/^"(.*)"$/, '$1').trim();

const paraDataIso = (valor: string): string | null => {
  const m = valor.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
};

const numeroBr = (valor: string): number => {
  const t = limpar(valor);
  if (!t) return 0;
  const normalizado = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
};

const contarBits = (mascara: number): number => {
  let total = 0;
  for (let m = mascara; m > 0; m >>= 1) total += m & 1;
  return total;
};

/** Confere se custo, preço e margem calculada pelo ERP são coerentes (tolerância de 1 p.p.). */
const margemConfere = (ultimoCusto: number, precoVenda: number, margemCalculada: number): boolean => {
  if (precoVenda <= 0) return false;
  return Math.abs(((precoVenda - ultimoCusto) / precoVenda) * 100 - margemCalculada) <= 1;
};

/**
 * Lê o bloco numérico de uma linha do CSV em que as vírgulas decimais
 * não vieram entre aspas (ex.: "12,05" aparece como "12" e "05").
 * São 6 valores: ULT_CUSTO, PEN_CUSTO, ANTE_CUSTO, PRECO_VENDA, MARG_CADASTRO, MARG_CALCULADA.
 * Cada valor ocupa 1 token (inteiro) ou 2 tokens (inteiro + parte decimal).
 * Testa todas as combinações possíveis e escolhe a que confere com a margem calculada pelo ERP.
 */
const lerBlocoNumerico = (tokens: string[]): number[] | null => {
  const n = tokens.length;
  const quantidadePares = n - 6;
  if (quantidadePares < 0 || quantidadePares > 6) return null;

  let melhor: { valores: number[]; score: number } | null = null;

  for (let mascara = 0; mascara < 64; mascara++) {
    if (contarBits(mascara) !== quantidadePares) continue;

    const valores: number[] = [];
    let i = 0;
    let ok = true;

    for (let v = 0; v < 6 && ok; v++) {
      const ehPar = (mascara & (1 << v)) !== 0;
      if (ehPar) {
        const inteiro = tokens[i] ?? '';
        const decimal = tokens[i + 1] ?? '';
        if (REGEX_INT.test(inteiro) && REGEX_DECIMAL_PARTE.test(decimal)) {
          valores.push(Number(`${inteiro}.${decimal}`));
          i += 2;
        } else {
          ok = false;
        }
      } else {
        const token = tokens[i] ?? '';
        if (REGEX_INT.test(token)) {
          valores.push(Number(token));
          i += 1;
        } else {
          ok = false;
        }
      }
    }

    if (!ok || i !== n) continue;

    let score = 0;
    if (margemConfere(valores[0], valores[3], valores[5])) score += 10;
    // Margem de cadastro costuma vir inteira (ex.: 25); prefere isso como desempate
    if (((mascara >> 4) & 1) === 0) score += 1;

    if (!melhor || score > melhor.score) melhor = { valores, score };
  }

  return melhor ? melhor.valores : null;
};

/** Interpreta uma linha do CSV separado por vírgula (com decimais também separados por vírgula). */
const interpretarLinhaVirgula = (campos: string[], numeroLinha: number): ItemImportado | string => {
  const t = campos.map(limpar);
  const idxData = t.findIndex((c) => REGEX_DATAHORA.test(c));
  if (idxData < 4) return `Linha ${numeroLinha}: formato de campos não reconhecido.`;

  const codprod = t[0];
  if (!codprod) return `Linha ${numeroLinha}: código do produto vazio.`;

  // Descrição pode conter vírgulas: tudo entre o código e o código de barras
  const descricao = t.slice(1, idxData - 3).join(', ');
  const codbarra = t[idxData - 3] ?? '';
  const unidade = t[idxData - 2] ?? '';
  const embalagem = t[idxData - 1] ?? '';
  const dataAlteracao = paraDataIso(t[idxData]);

  let tail = t.slice(idxData + 1);
  while (tail.length > 0 && tail[tail.length - 1] === '') tail = tail.slice(0, -1);

  // Nome do fornecedor = último token que não é numérico nem data
  let nomeIdx = -1;
  for (let i = tail.length - 1; i >= 0; i--) {
    const c = tail[i];
    if (c && !REGEX_NUMERICO_OU_DATA.test(c)) {
      nomeIdx = i;
      break;
    }
  }

  let bloco: string[];
  let codFornecedor = '';
  let nomeFornecedor = '';
  let dataUltimaEntrada: string | null = null;
  let numeroNota = '';

  if (nomeIdx >= 0) {
    nomeFornecedor = tail[nomeIdx];
    codFornecedor = nomeIdx >= 1 ? tail[nomeIdx - 1] : '';
    bloco = tail.slice(0, Math.max(nomeIdx - 1, 0));
    for (const c of tail.slice(nomeIdx + 1).filter((x) => x !== '')) {
      if (REGEX_DATA.test(c)) dataUltimaEntrada = c;
      else if (REGEX_INT.test(c)) numeroNota = c;
    }
  } else {
    bloco = tail;
  }

  const valores = lerBlocoNumerico(bloco);
  if (!valores) return `Linha ${numeroLinha} (${codprod}): não foi possível ler custos e preços.`;

  return {
    codprod,
    descricao,
    codbarra,
    unidade,
    embalagem,
    dataAlteracao,
    custoAtual: valores[0],
    custoPenultimo: valores[1],
    custoAntepenultimo: valores[2],
    precoVenda: valores[3],
    margemCadastroPct: valores[4],
    margemCalculadaPct: valores[5],
    codFornecedor,
    nomeFornecedor,
    dataUltimaEntrada,
    numeroNota
  };
};

/** Interpreta CSV separado por ponto e vírgula, mapeando colunas pelo nome do cabeçalho. */
const interpretarLinhaPontoVirgula = (
  campos: string[],
  indices: Record<string, number>,
  numeroLinha: number
): ItemImportado | string => {
  const get = (nome: string): string => {
    const idx = indices[nome];
    return idx === undefined ? '' : limpar(campos[idx] ?? '');
  };

  const codprod = get('COD_PRODUTO');
  if (!codprod) return `Linha ${numeroLinha}: código do produto vazio.`;

  return {
    codprod,
    descricao: get('DESCRICAO_PRODUTO'),
    codbarra: get('CODIGO_BARRAS'),
    unidade: get('UNIDADE'),
    embalagem: get('EMBALAGEM'),
    dataAlteracao: paraDataIso(get('DT_ALTERACAO_PRECO')),
    custoAtual: numeroBr(get('ULTIMO_CUSTO')),
    custoPenultimo: numeroBr(get('PENULTIMO_CUSTO')),
    custoAntepenultimo: numeroBr(get('ANTEPENULTIMO_CUSTO')),
    precoVenda: numeroBr(get('PRECO_VENDA')),
    margemCadastroPct: get('MARGEM_CADASTRO_PCT') ? numeroBr(get('MARGEM_CADASTRO_PCT')) : null,
    margemCalculadaPct: get('MARGEM_CALCULADA_PCT') ? numeroBr(get('MARGEM_CALCULADA_PCT')) : null,
    codFornecedor: get('COD_FORNECEDOR'),
    nomeFornecedor: get('NOME_FORNECEDOR'),
    dataUltimaEntrada: paraDataIso(get('DATA_ULTIMA_ENTRADA')),
    numeroNota: get('NUMERO_NOTA')
  };
};

/** Converte o texto do CSV em itens prontos para análise, acumulando erros por linha. */
export function interpretarCsvPrecificacao(texto: string): ResultadoImportacaoCsv {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const erros: string[] = [];
  const itens: ItemImportado[] = [];

  if (linhas.length < 2) {
    return { itens, erros: ['O arquivo está vazio ou não tem linhas de dados.'], dataMaxima: null, dataMinima: null };
  }

  const cabecalho = linhas[0].toUpperCase();
  if (!cabecalho.includes('COD_PRODUTO')) {
    erros.push('Cabeçalho não reconhecido: a primeira coluna deve ser COD_PRODUTO.');
  }

  if (linhas[0].includes(';')) {
    const indices: Record<string, number> = {};
    linhas[0].split(';').forEach((nome, idx) => {
      indices[limpar(nome).toUpperCase()] = idx;
    });
    for (let i = 1; i < linhas.length; i++) {
      const r = interpretarLinhaPontoVirgula(linhas[i].split(';'), indices, i + 1);
      if (typeof r === 'string') erros.push(r);
      else itens.push(r);
    }
  } else {
    for (let i = 1; i < linhas.length; i++) {
      const r = interpretarLinhaVirgula(linhas[i].split(','), i + 1);
      if (typeof r === 'string') erros.push(r);
      else itens.push(r);
    }
  }

  const datas = itens.map((it) => it.dataAlteracao).filter((d): d is string => !!d).sort();
  return {
    itens,
    erros,
    dataMinima: datas.length ? datas[0] : null,
    dataMaxima: datas.length ? datas[datas.length - 1] : null
  };
}
