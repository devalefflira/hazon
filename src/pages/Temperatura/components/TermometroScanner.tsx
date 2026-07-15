// Arquivo: src/pages/Temperatura/components/TermometroScanner.tsx
import { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';

interface TermometroScannerProps {
  onCaptura: (valor: number) => void;
  onFechar: () => void;
}

export function TermometroScanner({ onCaptura, onFechar }: TermometroScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [statusTexto, setStatusTexto] = useState('Iniciando câmera...');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let ativo = true;
    let intervaloProcessamento: number; // Tipo numérico nativo do navegador para evitar conflito com NodeJS

    async function iniciarCameraEReconhecimento() {
      try {
        setStatusTexto('Configurando leitor óptico...');
        const worker = await createWorker('por');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789.cC ',
        });

        if (!ativo) {
          await worker.terminate();
          return;
        }

        setStatusTexto('Abrindo câmera traseira...');
        const stream = await mediaDevices_getUserMedia({
          video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        }).catch(() => {
          return mediaDevices_getUserMedia({ video: true });
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setLoading(false);
        setStatusTexto('Aponte para o display do termômetro');

        intervaloProcessamento = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current || !ativo) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const larguraCorte = canvas.width * 0.6;
          const alturaCorte = canvas.height * 0.3;
          const xCorte = (canvas.width - larguraCorte) / 2;
          const yCorte = (canvas.height - alturaCorte) / 2;

          const imagemItem = ctx.getImageData(xCorte, yCorte, larguraCorte, alturaCorte);
          
          const d = imagemItem.data;
          for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i];       
            d[i+1] = 255 - d[i+1];   
            d[i+2] = 255 - d[i+2];   
          }
          
          const canvasTratado = document.createElement('canvas');
          canvasTratado.width = larguraCorte;
          canvasTratado.height = alturaCorte;
          canvasTratado.getContext('2d')?.putImageData(imagemItem, 0, 0);

          const { data: { text } } = await worker.recognize(canvasTratado);
          
          const regexTermometro = /(-?\d{1,2}\.\d)/;
          const resultado = text.replace(/\s+/g, '').match(regexTermometro);

          if (resultado && resultado[1]) {
            const valorDetectado = parseFloat(resultado[1]);
            
            if (valorDetectado >= -50 && valorDetectado <= 100) {
              clearInterval(intervaloProcessamento);
              await worker.terminate();
              stream.getTracks().forEach(track => track.stop());
              onCaptura(valorDetectado);
            }
          }
        }, 1500);

      } catch (err) {
        console.error(err);
        setStatusTexto('Erro ao iniciar scanner óptico.');
      }
    }

    iniciarCameraEReconhecimento();

    // === O RETORNO DE LIMPEZA FICA EXATAMENTE AQUI (NO FINAL DO USEEFFECT) ===
    return () => {
      ativo = false;
      if (intervaloProcessamento) clearInterval(intervaloProcessamento);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onCaptura]);

  function mediaDevices_getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-sm bg-gray-900 rounded-3xl overflow-hidden relative flex flex-col aspect-9/16 shadow-2xl border border-gray-800">
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
          <div className="w-[60%] aspect-2/1 border-4 border-dashed border-orange-500 rounded-2xl flex justify-center items-center bg-black/20 animate-pulse">
            <span className="text-[9px] text-white font-black bg-orange-500 px-2 py-0.5 rounded-md uppercase tracking-wider">Alinhe o Display Aqui</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 flex flex-col gap-3 items-center border-t border-gray-800">
          <div className="flex items-center gap-2">
            {loading && <div className="w-3 h-3 border-2 border-[#09797a] border-t-transparent rounded-full animate-spin" />}
            <p className="text-white text-xs font-bold text-center uppercase tracking-wide px-4">{statusTexto}</p>
          </div>
          
          <button
            type="button"
            onClick={onFechar}
            className="w-full bg-red-600/90 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all pointer-events-auto"
          >
            Fechar Câmera
          </button>
        </div>

      </div>
    </div>
  );
}