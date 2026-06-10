import { useZxing } from 'react-zxing';

interface LeitorProps {
  onLeituraSucesso: (codigo: string) => void;
  onFechar: () => void;
}

export default function LeitorCodigoBarras({ onLeituraSucesso, onFechar }: LeitorProps) {
  const { ref } = useZxing({
    onDecodeResult(result: any) {
      // Forçamos o acesso como 'any' para evitar que o TS verifique a existência de getText()
      const codigo = (result as any).text || (result as any).getText?.() || result.toString();
      onLeituraSucesso(codigo);
    },
    onError(error: any) {
      // Tratamento genérico para ignorar o erro de "NotFound" que é normal do scanner
      if (error && (error as any).name !== 'NotFoundException') {
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