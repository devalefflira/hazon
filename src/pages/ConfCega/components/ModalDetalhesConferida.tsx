import React from "react";
import type { ConferenciaRegistro } from "../types/conferencias.types";
import { gerarPdfRelatorioConferencia } from "../utils/gerarPdfRelatorio";

interface ModalDetalhesProps {
  conferencia: ConferenciaRegistro;
  onClose: () => void;
}

export const ModalDetalhesConferida: React.FC<ModalDetalhesProps> = ({ conferencia, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <span className="text-xs uppercase font-bold text-teal-400">Conferência Finalizada</span>
            <h2 className="text-xl font-bold">NF #{conferencia.numero_nota_fiscal} — {conferencia.fornecedor?.razao_social}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl mb-6 text-xs text-slate-600">
            <div><strong>Código:</strong> {conferencia.codigo_customizado}</div>
            <div><strong>Emissão Nota:</strong> {new Date(conferencia.data_emissao_nota).toLocaleDateString("pt-BR")}</div>
            <div><strong>Conferente:</strong> {conferencia.usuario?.nome || "-"}</div>
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th className="pb-2">Cód</th>
                <th className="pb-2">Produto</th>
                <th className="pb-2 text-right">Qtd Contada</th>
                <th className="pb-2">Lote</th>
                <th className="pb-2">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conferencia.conferencia_itens?.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 font-semibold text-slate-600">{item.produto?.codprod}</td>
                  <td className="py-2.5 text-slate-800">{item.produto?.descricao}</td>
                  <td className="py-2.5 text-right font-bold text-teal-800">{item.quantidade_contada} UN</td>
                  <td className="py-2.5 text-slate-600">{item.lote || "-"}</td>
                  <td className="py-2.5 text-slate-600">{item.data_validade ? new Date(item.data_validade).toLocaleDateString("pt-BR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl">
            Fechar
          </button>
          <button
            onClick={() => gerarPdfRelatorioConferencia(conferencia)}
            className="px-5 py-2 text-sm font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow transition"
          >
            Exportar / Imprimir PDF
          </button>
        </div>
      </div>
    </div>
  );
};