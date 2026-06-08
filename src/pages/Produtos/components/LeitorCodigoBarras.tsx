import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface LeitorProps {
  onLeituraSucesso: (codigo: string) => void;
  onFechar: () => void;
}

export default function LeitorCodigoBarras({ onLeituraSucesso, onFechar }: LeitorProps) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { fps: 10, qrbox: { width: 250, height: 150 } }, 
      false
    );

    scanner.render(
      (decodedText) => {
        onLeituraSucesso(decodedText);
        scanner.clear();
      },
      (err) => console.warn(err)
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onLeituraSucesso]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div id="reader" className="w-full max-w-sm bg-white rounded-2xl overflow-hidden"></div>
      <button 
        onClick={onFechar} 
        className="mt-6 bg-white text-[#09797a] font-bold py-3 px-8 rounded-full shadow-lg active:scale-95 transition-all"
      >
        Cancelar Leitura
      </button>
    </div>
  );
}