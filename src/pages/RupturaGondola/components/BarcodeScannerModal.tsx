// src/pages/RupturaGondola/components/BarcodeScannerModal.tsx
import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  onScanSuccess: (codigoLido: string) => void;
  onFechar: () => void;
}

export function BarcodeScannerModal({ onScanSuccess, onFechar }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scannerId = 'reader-camera';
    const html5Qrcode = new Html5Qrcode(scannerId);
    scannerRef.current = html5Qrcode;

    const config = {
      fps: 20,
      qrbox: { width: 280, height: 160 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39
      ]
    };

    html5Qrcode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Feedback de vibração
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          // Envia o código capturado e fecha o leitor
          onScanSuccess(decodedText.trim());
          pararScanner();
          onFechar();
        },
        () => {
          // Ignora frames sem código
        }
      )
      .catch((err) => {
        console.error('Falha ao abrir câmara:', err);
      });

    const pararScanner = async () => {
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        }
      } catch (e) {
        console.warn('Erro ao finalizar câmara:', e);
      }
    };

    return () => {
      pararScanner();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-slate-900 rounded-3xl p-4 shadow-2xl flex flex-col items-center gap-3 border border-slate-700 animate-slideUp"
      >
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-black uppercase text-white tracking-wide">
              Leitor de Código de Barras
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs hover:bg-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Div de renderização do vídeo da câmara */}
        <div className="w-full relative overflow-hidden rounded-2xl bg-black border border-slate-700 aspect-4/3 flex items-center justify-center">
          <div id="reader-camera" className="w-full h-full"></div>
          
          {/* Mira visual guia */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-24 border-2 border-dashed border-teal-400/80 rounded-xl animate-pulse"></div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 font-medium text-center">
          Aponte a câmara para a etiqueta de gôndola ou para o código de barras do produto.
        </p>

        <button
          type="button"
          onClick={onFechar}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}