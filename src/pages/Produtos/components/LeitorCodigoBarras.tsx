import { useZxing } from 'react-zxing';

interface LeitorProps {
  onLeituraSucesso: (codigo: string) => void;
  onFechar: () => void;
}

export default function LeitorCodigoBarras({ onLeituraSucesso, onFechar }: LeitorProps) {
  const { ref } = useZxing({
    constraints: {
      video: { facingMode: { ideal: "environment" } }
    },
    onDecodeResult(result: any) {
      // DEBUG: Vamos ver o que vem no console antes de passar para frente
      console.log("Resultado bruto do scanner:", result);

      // A biblioteca zxing retorna um objeto. O valor do código está em 'text'
      const codigo = result?.text || "";

      if (codigo && codigo !== "[object Object]") {
        onLeituraSucesso(codigo);
      } else {
        // Fallback caso a estrutura seja diferente
        const valorAlternativo = typeof result === 'string' ? result : JSON.stringify(result);
        console.warn("Código não identificado como string, valor:", valorAlternativo);
      }
    },
    onError(error: any) {
      if (error && error.name !== 'NotFoundException') {
        console.warn("Erro de leitura:", error);
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      {/* Adicionei 'playsInline' e 'autoPlay' que são essenciais para iOS/Android */}
      <video ref={ref} autoPlay playsInline className="w-full max-w-sm rounded-2xl bg-black" />
      <button
        onClick={onFechar}
        className="mt-6 bg-white text-black font-bold py-3 px-8 rounded-full shadow-lg active:scale-95 transition-all"
      >
        Cancelar Leitura
      </button>
    </div>
  );
}