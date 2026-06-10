import { useZxing } from 'react-zxing';

interface LeitorProps {
  onLeituraSucesso: (codigo: string) => void;
  onFechar: () => void;
}

export default function LeitorCodigoBarras({ onLeituraSucesso, onFechar }: LeitorProps) {
  const { ref } = useZxing({
    // Forçamos a câmera traseira (environment) através das constraints de vídeo
    constraints: {
      video: {
        facingMode: { ideal: "environment" }
      }
    },
    // Removi os 'formats' para que ele leia TUDO (EAN-8, EAN-13, UPC, Code 128, etc)
    onDecodeResult(result: any) {
      const codigo = (result as any).text || result.toString();
      if (codigo) onLeituraSucesso(codigo);
    },
    onError(error: any) {
      // Ignoramos o erro de "NotFound" que acontece enquanto a câmera busca foco
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