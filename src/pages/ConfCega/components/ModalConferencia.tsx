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
      codbarra: item.produto?.codbarra || "-",
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="bg-teal-800 text-white p-5 flex justify-between items-center">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-teal-200">Conferência Cega</span>
            <h2 className="text-xl font-black">NF #{conferencia.numero_nota_fiscal} — {conferencia.fornecedor?.razao_social}</h2>
          </div>
          <div className="text-right text-xs text-teal-100">
            <div><strong>Código:</strong> {conferencia.codigo_customizado}</div>
            <div><strong>Emissão:</strong> {new Date(conferencia.data_emissao_nota).toLocaleDateString("pt-BR")}</div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase">
                <th className="pb-3 w-16">Cód.</th>
                <th className="pb-3 w-36">Cód. Barras</th>
                <th className="pb-3">Descrição do Produto</th>
                <th className="pb-3 w-28 text-center">Qtd (UN)</th>
                <th className="pb-3 w-32">Lote</th>
                <th className="pb-3 w-36">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {itens.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 font-semibold text-slate-700">{item.codprod}</td>
                  <td className="py-3 text-xs text-slate-500">{item.codbarra || "Sem EAN"}</td>
                  <td className="py-3 font-medium text-slate-800">{item.descricao}</td>
                  <td className="py-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={item.quantidade_contada}
                      onChange={(e) => handleItemChange(idx, "quantidade_contada", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white rounded-lg px-2 py-1.5 text-center font-bold text-slate-800"
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="text"
                      placeholder="Lote"
                      value={item.lote}
                      onChange={(e) => handleItemChange(idx, "lote", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white rounded-lg px-2 py-1.5 text-xs text-slate-700 uppercase"
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="date"
                      value={item.data_validade}
                      onChange={(e) => handleItemChange(idx, "data_validade", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white rounded-lg px-2 py-1.5 text-xs text-slate-700"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <button
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Cancelar
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => handleAcao("Em Andamento")}
              disabled={salvando}
              className="px-5 py-2.5 text-sm font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition"
            >
              Pausar Conferência
            </button>
            <button
              onClick={() => handleAcao("Finalizada")}
              disabled={salvando}
              className="px-6 py-2.5 text-sm font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-md transition"
            >
              Finalizar Conferência
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};