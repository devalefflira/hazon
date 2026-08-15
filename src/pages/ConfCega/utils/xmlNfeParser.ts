import type { NotaImportadaXML, ItemNotaXML } from "../types/conferencias.types";

export function parsearXMLNotaFiscal(xmlText: string): NotaImportadaXML {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error("Formato de arquivo XML inválido.");
  }

  const emit = xmlDoc.getElementsByTagName("emit")[0];
  const cnpj = emit?.getElementsByTagName("CNPJ")[0]?.textContent || "";
  const razaoSocial = emit?.getElementsByTagName("xNome")[0]?.textContent || emit?.getElementsByTagName("xFant")[0]?.textContent || "Fornecedor Desconhecido";

  const ide = xmlDoc.getElementsByTagName("ide")[0];
  const numeroNota = ide?.getElementsByTagName("nNF")[0]?.textContent || "S/N";
  const dhEmi = ide?.getElementsByTagName("dhEmi")[0]?.textContent || ide?.getElementsByTagName("dEmi")[0]?.textContent || new Date().toISOString();

  const detElements = xmlDoc.getElementsByTagName("det");
  const itens: ItemNotaXML[] = [];

  for (let i = 0; i < detElements.length; i++) {
    const prod = detElements[i].getElementsByTagName("prod")[0];
    if (prod) {
      const cProd = prod.getElementsByTagName("cProd")[0]?.textContent || "";
      const cEAN = prod.getElementsByTagName("cEAN")[0]?.textContent || "";
      const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || "";
      const uCom = prod.getElementsByTagName("uCom")[0]?.textContent || "UN";
      const qCom = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0");

      itens.push({
        cProd,
        cEAN: cEAN === "SEM GTIN" ? "" : cEAN,
        xProd,
        uCom,
        qComOriginal: qCom,
        quantidadeContada: 0,
        lote: "",
        dataValidade: ""
      });
    }
  }

  return {
    cnpj,
    razaoSocial,
    numeroNota,
    dataEmissao: dhEmi.split("T")[0],
    itens
  };
}