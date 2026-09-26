// src/pages/Recebimentos/components/ModalFotosRecepcao.tsx
import { useState, useRef } from 'react';
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

  // Referências para os inputs de câmera nativa
  const inputFrenteRef = useRef<HTMLInputElement>(null);
  const inputBarrasRef = useRef<HTMLInputElement>(null);
  const inputConfCegaRef = useRef<HTMLInputElement>(null);

  // Compactar e converter imagem da câmera em Base64 leve
  const capturarDaCamera = (e: React.ChangeEvent<HTMLInputElement>, setFoto: (b64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = Math.min(img.width, MAX_WIDTH);
        canvas.height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setFoto(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Limpa para permitir nova captura se necessário
  };

  const handleAdicionarItemFoto = () => {
    if (tipoDocumento === 'Não Fiscal / Manual') {
      if (!fotoFrente || !fotoBarras) {
        alert('Tire a foto da frente e do código de barras antes de adicionar.');
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
        alert('Tire a foto da conferência cega antes de adicionar.');
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
      alert('Capture ao menos uma foto antes de confirmar.');
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
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
      onClick={onFechar}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl sm:rounded-4xl p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              {tipoDocumento === 'Caminhão da Casa' ? 'Captura da Conferência Cega' : 'Capturar Fotos dos Produtos'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Abra a câmera e fotografe em tempo real
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

        {/* INPUTS ESCONDIDOS COM CAPTURE=ENVIRONMENT (ABRE CÂMERA IMEDIATAMENTE) */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={inputFrenteRef}
          onChange={(e) => capturarDaCamera(e, setFotoFrente)}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={inputBarrasRef}
          onChange={(e) => capturarDaCamera(e, setFotoBarras)}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={inputConfCegaRef}
          onChange={(e) => capturarDaCamera(e, setFotoConfCega)}
          className="hidden"
        />

        {/* BOTÕES DE CÂMERA RÁPIDA */}
        {tipoDocumento === 'Não Fiscal / Manual' ? (
          <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs font-black uppercase text-slate-700">
              Fotografar Produto (Frente + Código de Barras)
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* Botão Câmera Frente */}
              <div className="flex flex-col gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => inputFrenteRef.current?.click()}
                  className={`w-full py-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-black text-xs uppercase cursor-pointer transition-all active:scale-95 ${
                    fotoFrente
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-dashed border-teal-600 bg-teal-50/50 text-[#09797a] hover:bg-teal-50'
                  }`}
                >
                  <span className="text-2xl">{fotoFrente ? '📸' : '📷'}</span>
                  <span>{fotoFrente ? 'Refazer Frente' : 'Tirar Foto Frente'}</span>
                </button>
                {fotoFrente && (
                  <img src={fotoFrente} alt="Frente" className="w-full h-24 object-cover rounded-xl border border-slate-200" />
                )}
              </div>

              {/* Botão Câmera Barras */}
              <div className="flex flex-col gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => inputBarrasRef.current?.click()}
                  className={`w-full py-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-black text-xs uppercase cursor-pointer transition-all active:scale-95 ${
                    fotoBarras
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-dashed border-teal-600 bg-teal-50/50 text-[#09797a] hover:bg-teal-50'
                  }`}
                >
                  <span className="text-2xl">{fotoBarras ? '📸' : '🔍'}</span>
                  <span>{fotoBarras ? 'Refazer Barras' : 'Tirar Cód. Barras'}</span>
                </button>
                {fotoBarras && (
                  <img src={fotoBarras} alt="Barras" className="w-full h-24 object-cover rounded-xl border border-slate-200" />
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={!fotoFrente || !fotoBarras}
              onClick={handleAdicionarItemFoto}
              className="mt-1 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              + Adicionar Par de Fotos
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
            <span className="text-xs font-black uppercase text-slate-700">
              Fotografar Folha de Conferência Cega
            </span>
            <button
              type="button"
              onClick={() => inputConfCegaRef.current?.click()}
              className={`w-full py-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 font-black text-xs uppercase cursor-pointer transition-all active:scale-95 ${
                fotoConfCega
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-dashed border-teal-600 bg-teal-50/50 text-[#09797a] hover:bg-teal-50'
              }`}
            >
              <span className="text-3xl">{fotoConfCega ? '📸' : '📷'}</span>
              <span>{fotoConfCega ? 'Tirar Nova Foto' : 'Abrir Câmera e Fotografar'}</span>
            </button>

            {fotoConfCega && (
              <img src={fotoConfCega} alt="Conferência" className="w-full h-36 object-cover rounded-xl border border-slate-200" />
            )}

            <button
              type="button"
              disabled={!fotoConfCega}
              onClick={handleAdicionarItemFoto}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              + Adicionar Foto
            </button>
          </div>
        )}

        {/* LISTAGEM DE FOTOS ANEXADAS */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400">
            Fotos Confirmadas para Envio ({listaFotos.length})
          </span>

          {listaFotos.length === 0 ? (
            <div className="p-3 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
              Nenhuma foto adicionada ainda.
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

        {/* RODAPÉ */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase cursor-pointer hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando || listaFotos.length === 0}
            onClick={handleSalvarTodas}
            className="px-5 py-2.5 rounded-xl bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white font-black text-xs uppercase shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {salvando ? 'Gravando...' : 'Salvar e Concluir'}
          </button>
        </div>

      </div>
    </div>
  );
}