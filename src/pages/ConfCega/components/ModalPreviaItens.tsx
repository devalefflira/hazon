// src/pages/ConfCega/components/ModalPreviaItens.tsx
import React from "react";
import type { ConferenciaRegistro } from "../types/conferencias.types";

interface ModalPreviaItensProps {
  conferencia: ConferenciaRegistro;
  onClose: () => void;
  onIniciarConferencia: () => void;
}

export const ModalPreviaItens: React.FC<ModalPreviaItensProps> = ({
  conferencia,
  onClose,
  onIniciarConferencia
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-black text-teal-400">Relação de Produtos</span>
            <h2 className="text-sm sm:text-base font-black leading-tight mt-0.5">
              NF #{conferencia.numero_nota_fiscal} — {conferencia.fornecedor?.razao_social}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold p-1">✕</button>
        </div>

        {/* Lista de Produtos */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50 space-y-2">
          <div className="text-xs font-bold text-slate-500 mb-2">
            Total de Itens na Nota: {conferencia.conferencia_itens?.length || 0}
          </div>
          {conferencia.conferencia_itens?.map((item, index) => (
            <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <div className="text-xs font-bold text-slate-800 leading-snug">
                {item.produto?.descricao}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 flex justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose();
              onIniciarConferencia();
            }}
            className="px-5 py-2.5 text-xs font-black text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-md transition"
          >
            Iniciar Conferência
          </button>
        </div>
      </div>
    </div>
  );
};