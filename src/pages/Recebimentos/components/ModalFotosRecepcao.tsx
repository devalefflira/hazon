// src/pages/Recebimentos/components/ModalFotosRecepcao.tsx
import { useState } from 'react';
import { recebimentoService } from '../services/recebimentoService';
import type { FotoRecebimento, TipoDocumentoRecebimento } from '../types/recebimento.types';

interface ModalFotosRecepcaoProps {
  fluxoId: string;
  faseId: string;
  tipoDocumento: TipoDocumentoRecebimento;
  onFechar: () => void;
  onSalvoSucesso: () => void;
}

export default function ModalFotosRecepcao({
  fluxoId,
  faseId,
  tipoDocumento,
  onFechar,
  onSalvoSucesso
}: ModalFotosRecepcaoProps) {
  const [listaFotos, setListaFotos] = useState<FotoRecebimento[]>([]);
  const [fotoFrente, setFotoFrente] = useState<string | null>(null);
  const [fotoBarras, setFotoBarras] = useState<string | null>(null);
  const [fotoConfCega, setFotoConfCega] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Leitura de imagem para Base64
  const processarArquivo = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdicionarItemFoto = () => {
    if (tipoDocumento === 'Não Fiscal / Manual') {
      if (!fotoFrente || !fotoBarras) {
        alert('Carregue a foto da frente do produto e a foto do código de barras.');
        return;
      }
      setListaFotos((prev) => [
        ...prev,
        { tipo_foto: 'frente_produto', foto_url: fotoFrente },
        { tipo_foto: 'codigo_barras', foto_url: fotoBarras }
      ]);
      setFotoFrente(null);
      setFotoBarras(null);
    } else if (tipoDocumento === 'Caminhão da Casa') {
      if (!fotoConfCega) {
        alert('Carregue a foto do documento de conferência cega.');
        return;
      }
      setListaFotos((prev) => [
        ...prev,
        { tipo_foto: 'conferencia_cega', foto_url: fotoConfCega }
      ]);
      setFotoConfCega(null);
    }
  };

  const handleRemoverFoto = (idx: number) => {
    setListaFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSalvarTodas = async () => {
    if (listaFotos.length === 0) {
      alert('Adicione ao menos uma imagem à lista antes de salvar.');
      return;
    }
    try {
      setSalvando(true);
      await recebimentoService.salvarFotosRecepcao(fluxoId, faseId, listaFotos);
      alert('Fotos registradas com sucesso!');
      onSalvoSucesso();
    } catch (err: any) {
      alert(`Erro ao salvar fotos: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onFechar}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl sm:rounded-4xl p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col gap-5 max-h-[92vh] overflow-y-auto animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              {tipoDocumento === 'Caminhão da Casa' ? 'Foto da Conferência Cega' : 'Fotos dos Produtos'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Comprovação da recepção da carga
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Uploads por tipo */}
        {tipoDocumento === 'Não Fiscal / Manual' ? (
          <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs font-black uppercase text-slate-700">
              Capturar Par de Fotos (Frente + Código de Barras)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  1. Frente do Produto
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processarArquivo(file, setFotoFrente);
                  }}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-[#09797a] file:text-white"
                />
                {fotoFrente && (
                  <img src={fotoFrente} alt="Frente" className="w-full h-20 object-cover rounded-xl mt-2 border border-slate-200" />
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  2. Código de Barras
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processarArquivo(file, setFotoBarras);
                  }}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-[#09797a] file:text-white"
                />
                {fotoBarras && (
                  <img src={fotoBarras} alt="Barras" className="w-full h-20 object-cover rounded-xl mt-2 border border-slate-200" />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdicionarItemFoto}
              className="mt-2 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              + Adicionar Par à Listagem
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs font-black uppercase text-slate-700">
              Foto da Conferência Cega da Carga
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processarArquivo(file, setFotoConfCega);
              }}
              className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-[#09797a] file:text-white"
            />
            {fotoConfCega && (
              <img src={fotoConfCega} alt="Conferência" className="w-full h-32 object-cover rounded-xl mt-2 border border-slate-200" />
            )}

            <button
              type="button"
              onClick={handleAdicionarItemFoto}
              className="mt-2 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              + Adicionar Foto à Listagem
            </button>
          </div>
        )}

        {/* Lista de Fotos Adicionadas */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400">
            Fotos Prontas para Gravar ({listaFotos.length})
          </span>

          {listaFotos.length === 0 ? (
            <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
              Nenhuma imagem adicionada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {listaFotos.map((f, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={f.foto_url} alt={`Foto ${i}`} className="w-full h-20 object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                    {f.tipo_foto.replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoverFoto(i)}
                    className="absolute top-1 right-1 bg-red-600 text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase cursor-pointer hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando || listaFotos.length === 0}
            onClick={handleSalvarTodas}
            className="px-5 py-2.5 rounded-xl bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white font-black text-xs uppercase shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {salvando ? 'Gravando...' : 'Salvar Fotos'}
          </button>
        </div>

      </div>
    </div>
  );
}