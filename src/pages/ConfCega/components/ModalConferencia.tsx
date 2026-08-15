import React, { useState } from "react";
import type { ConferenciaRegistro } from "../types/conferencias.types";

interface ModalConferenciaProps {
  conferencia: ConferenciaRegistro;
  onClose: () => void;
  onSalvar: (conferenciaId: string, itens: any[], status: "Em Andamento" | "Finalizada") => Promise<void>;
}

export const ModalConferencia: React.FC<ModalConferenciaProps> = ({ conferencia, onClose, onSalvar }) => {
  const [itens, setItens] = useState<any[]>(
    conferencia.conferencia_itens?.map(item => ({
      id: item.id,
      codprod: item.produto?.codprod || "-",
      codbarra: item.produto?.codbarra || "",
      descricao: item.produto?.descricao || "-",
      quantidade_contada: item.quantidade_contada || "",
      lote: item.lote || "",
      data_validade: item.data_validade || ""
    })) || []
  );

  const [salvando, setSalvando] = useState(false);

  const handleItemChange = (index: number, campo: string, valor: any) => {
    const novosItens = [...itens];
    novosItens[index][campo] = valor;
    setItens(novosItens);
  };

  const handleAcao = async (status: "Em Andamento" | "Finalizada") => {
    try {
      setSalvando(true);
      await onSalvar(conferencia.id, itens, status);
      onClose();
    } catch (err: any) {
      alert("Erro ao salvar conferência: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Cabeçalho */}
        <div className="bg-teal-900 text-white p-4 sm:p-5 flex justify-between items-start">
          <div className="pr-2">
            <span className="text-[10px] uppercase tracking-widest font-black text-teal-300">Conferência Cega</span>
            <h2 className="text-base sm:text-lg font-black leading-tight mt-0.5">NF #{conferencia.numero_nota_fiscal} — {conferencia.fornecedor?.razao_social}</h2>
          </div>
          <div className="text-right text-[11px] text-teal-100 flex-shrink-0">
            <div><strong>{conferencia.codigo_customizado}</strong></div>
            <div>{new Date(conferencia.data_emissao_nota).toLocaleDateString("pt-BR")}</div>
          </div>
        </div>

        {/* Lista de Itens (Cards Mobile) */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50">
          {itens.map((item, idx) => (
            <div key={item.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              
              {/* Identificação do Produto */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="bg-teal-50 text-teal-800 text-[11px] font-black px-2 py-0.5 rounded-md">
                      CÓD: {item.codprod}
                    </span>
                    {item.codbarra && (
                      <span className="text-slate-400 text-[10px]">
                        EAN: {item.codbarra}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                    {item.descricao}
                  </h4>
                </div>
              </div>

              {/* Grid de Inputs Responsivos */}
              <div className="grid grid-cols-12 gap-2 pt-1 border-t border-slate-100">
                {/* Quantidade */}
                <div className="col-span-4">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Qtd (UN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={item.quantidade_contada}
                    onChange={(e) => handleItemChange(idx, "quantidade_contada", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl px-2 py-2 text-center text-sm font-black text-slate-800"
                  />
                </div>

                {/* Lote */}
                <div className="col-span-4">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Lote
                  </label>
                  <input
                    type="text"
                    placeholder="Lote"
                    value={item.lote}
                    onChange={(e) => handleItemChange(idx, "lote", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 rounded-xl px-2 py-2 text-xs font-semibold uppercase text-slate-700"
                  />
                </div>

                {/* Validade */}
                <div className="col-span-4">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Validade
                  </label>
                  <input
                    type="date"
                    value={item.data_validade}
                    onChange={(e) => handleItemChange(idx, "data_validade", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 rounded-xl px-1.5 py-2 text-[11px] font-semibold text-slate-700"
                  />
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Rodapé e Botões */}
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 flex flex-wrap sm:flex-nowrap justify-between gap-2">
          <button
            onClick={onClose}
            disabled={salvando}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition order-3 sm:order-1"
          >
            Cancelar
          </button>

          <div className="w-full sm:w-auto flex gap-2 order-1 sm:order-2">
            <button
              onClick={() => handleAcao("Em Andamento")}
              disabled={salvando}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-black text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition"
            >
              Pausar
            </button>
            <button
              onClick={() => handleAcao("Finalizada")}
              disabled={salvando}
              className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-black text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-md transition"
            >
              Finalizar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};