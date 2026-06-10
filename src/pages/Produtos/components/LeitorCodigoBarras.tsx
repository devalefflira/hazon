import { useZxing } from 'react-zxing';

interface LeitorProps {
  onLeituraSucesso: (codigo: string) => void;
  onFechar: () => void;
}

export default function LeitorCodigoBarras({ onLeituraSucesso, onFechar }: LeitorProps) {
  const { ref } = useZxing({
    onDecodeResult(result) {
      // Correção do erro ts(2339): 'getText' não existe, acessamos '.text' diretamente
      const codigo = (result as any).text; 
      if (codigo) onLeituraSucesso(codigo);
    },
    // Correção do erro ts(2322): passando os formatos como strings literais aceitas pelo tipo
    formats: ["ean_13", "ean_8", "upc_a", "code_128"],
  });

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
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