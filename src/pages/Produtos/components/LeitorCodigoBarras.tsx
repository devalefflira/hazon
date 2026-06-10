import { useZxing } from 'react-zxing';

interface LeitorProps {
  onLeituraSucesso: (codigo: string) => void;
  onFechar: () => void;
}

export default function LeitorCodigoBarras({ onLeituraSucesso, onFechar }: LeitorProps) {
  const { ref } = useZxing({
    onDecodeResult(result: any) {
      // O resultado do ZXing tem uma propriedade .text que contém o valor do código
      const codigo = result.text || result.getText?.() || "";
      
      if (codigo) {
        onLeituraSucesso(codigo);
      }
    },
    onError(error: any) {
      if (error && error.name !== 'NotFoundException') {
        console.warn("Erro de leitura:", error);
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
      <video ref={ref} className="w-full max-w-sm rounded-2xl bg-black" />
      <button 
        onClick={onFechar} 
        className="mt-6 bg-white text-black font-bold py-3 px-8 rounded-full shadow-lg active:scale-95 transition-all"
      >
        Cancelar
      </button>
    </div>
  );
}