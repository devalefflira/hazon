// src/pages/RupturaGondola/components/ModalImportarEntradasErp.tsx
import { useState } from 'react';
import { rupturaService } from '../services/rupturaService';

interface ModalImportarEntradasErpProps {
  usuarioLogadoId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export function ModalImportarEntradasErp({ usuarioLogadoId, onFechar, onSucesso }: ModalImportarEntradasErpProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const parseCsv = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
    if (lines.length < 2) return [];

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"|"$/g, ''));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(separator);
      if (currentline.length === headers.length) {
        const obj: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentline[j]?.trim().replace(/^"|"$/g, '') || '';
        }
        rows.push(obj);
      }
    }
    return rows;
  };

  const handleUpload = async () => {
    if (!arquivo) {
      setErro('Selecione um arquivo CSV de entradas primeiro.');
      return;
    }

    try {
      setProcessando(true);
      setErro(null);

      const text = await arquivo.text();
      const linhas = parseCsv(text);

      if (linhas.length === 0) {
        throw new Error('Nenhuma linha identificada no arquivo CSV.');
      }

      await rupturaService.importarCsvEntradas({
        usuarioId: usuarioLogadoId,
        nomeArquivo: arquivo.name,
        linhas
      });

      onSucesso();
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Falha ao processar o arquivo CSV.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-slideUp font-sans"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-900">
              Importar Entradas do ERP (.csv)
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">
              Base de cruzamento para Ruptura Operacional vs. Comercial
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-2xl text-[11px] text-teal-950 font-medium">
            O arquivo deve conter as colunas: <strong>Data Inicial Entradas</strong>, <strong>Data Final Entradas</strong>, <strong>Código Sistema</strong>, <strong>Descrição</strong> e <strong>Código de barras</strong>.
          </div>

          <label className="border-2 border-dashed border-slate-200 hover:border-[#09797a] rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all bg-slate-50">
            <span className="text-xl">📄</span>
            <span className="text-xs font-black uppercase text-slate-700">
              {arquivo ? arquivo.name : 'Selecionar Arquivo .CSV'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              {arquivo ? `${(arquivo.size / 1024).toFixed(1)} KB` : 'Clique ou arraste aqui'}
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setArquivo(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>

          {erro && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
              {erro}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onFechar}
            disabled={processando}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={processando || !arquivo}
            className="px-4 py-2 bg-[#09797a] hover:bg-[#075f60] disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {processando ? 'Processando Lote...' : 'Carregar Base ERP'}
          </button>
        </div>
      </div>
    </div>
  );
}