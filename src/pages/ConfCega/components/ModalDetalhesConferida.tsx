import React from "react";
import type { ConferenciaRegistro } from "../types/conferencias.types";
import { gerarPdfRelatorioConferencia } from "../utils/gerarPdfRelatorio";

interface ModalDetalhesProps {
  conferencia: ConferenciaRegistro;
  onClose: () => void;
}

export const ModalDetalhesConferida: React.FC<ModalDetalhesProps> = ({ conferencia, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-black text-teal-400">Conferência Finalizada</span>
            <h2 className="text-base sm:text-lg font-black leading-tight mt-0.5">NF #{conferencia.numero_nota_fiscal} — {conferencia.fornecedor?.razao_social}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold p-1">✕</button>
        </div>

        {/* Informações da Conferência */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-50 space-y-3">
          <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-slate-200 text-[11px] text-slate-600 font-medium">
            <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Código</span><strong>{conferencia.codigo_customizado}</strong></div>
            <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Emissão</span>{new Date(conferencia.data_emissao_nota).toLocaleDateString("pt-BR")}</div>
            <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Conferente</span><strong className="text-teal-800">{conferencia.usuario?.nome || "-"}</strong></div>
          </div>

          {/* Cards dos Itens */}
          <div className="space-y-2">
            {conferencia.conferencia_itens?.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 leading-snug">{item.produto?.descricao}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Lote: <strong className="text-slate-700">{item.lote || "-"}</strong> • Validade: <strong className="text-slate-700">{item.data_validade ? new Date(item.data_validade).toLocaleDateString("pt-BR") : "-"}</strong>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="bg-teal-50 text-teal-800 text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl">
                    {item.quantidade_contada} UN
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 flex justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            Fechar
          </button>
          <button
            onClick={() => gerarPdfRelatorioConferencia(conferencia)}
            className="px-5 py-2.5 text-xs font-black text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            Exportar / Imprimir PDF
          </button>
        </div>

      </div>
    </div>
  );
};