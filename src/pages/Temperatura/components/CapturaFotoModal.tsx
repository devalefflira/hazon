// Arquivo: src/pages/Temperatura/components/CapturaFotoModal.tsx
import { useEffect, useRef, useState } from 'react';

interface CapturaFotoModalProps {
  onFotoCapturada: (base64Img: string) => void;
  onFechar: () => void;
}

export function CapturaFotoModal({ onFotoCapturada, onFechar }: CapturaFotoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [statusTexto, setStatusTexto] = useState('Iniciando câmera...');

  useEffect(() => {
    async function abrirCamera() {
      try {
        // Solicita estritamente a câmera traseira do dispositivo celular
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
        }).catch(() => {
          // Fallback caso seja testado em computador sem câmera traseira
          return navigator.mediaDevices.getUserMedia({ video: true });
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatusTexto('Posicione o termômetro na mira');
      } catch (err) {
        console.error(err);
        setStatusTexto('Erro ao acessar a câmera traseira do dispositivo.');
      }
    }

    abrirCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleTirarFoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Captura o quadro atual do vídeo e joga no canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Converte para string Base64 comprimida em formato JPEG leve (qualidade 0.7)
    const base64 = canvas.toDataURL('image/jpeg', 0.7);
    
    // Fecha a câmera e devolve o base64 para a sessão
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onFotoCapturada(base64);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-sm bg-gray-900 rounded-3xl overflow-hidden relative flex flex-col aspect-9/16 shadow-2xl border border-gray-800">
        
        {/* VIEWPORT DA CÂMERA TRASEIRA */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* FEEDBACK VISUAL DE MIRA */}
        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
          <div className="w-[70%] aspect-square border-4 border-dashed border-[#09797a] rounded-3xl bg-black/10 flex justify-center items-center">
            <span className="text-[10px] text-white font-black bg-[#09797a] px-3 py-1 rounded-md uppercase tracking-wider animate-pulse">Enquadre o Termômetro</span>
          </div>
        </div>

        {/* CONTROLES INFERIORES */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 flex flex-col gap-2.5 items-center border-t border-gray-800">
          <p className="text-gray-400 text-[10px] font-black uppercase text-center tracking-wide mb-1">{statusTexto}</p>
          
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={handleTirarFoto}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
            >
              📸 Capturar Foto
            </button>
            <button
              type="button"
              onClick={onFechar}
              className="bg-gray-800 text-gray-400 font-bold text-xs px-4 rounded-xl active:scale-95 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}