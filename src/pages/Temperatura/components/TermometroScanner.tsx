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
    let intervaloProcessamento: number;
    let processandoQuadro = false; // Trava de segurança para não acumular processamento

    async function iniciarCameraEReconhecimento() {
      try {
        setStatusTexto('Configurando leitor óptico...');
        
        // Inicializa o Worker focado estritamente nos caracteres do termômetro
        const worker = await createWorker('por');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789.cC-',
          tessedit_pageseg_mode: '7' as any, // <-- Cast com 'as any' para sanar o erro de tipagem estrita do PSM
        });

        if (!ativo) {
          await worker.terminate();
          return;
        }

        setStatusTexto('Abrindo câmera traseira...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: 640 }, // Reduzido de 1280 para 640 (Quadros menores processam 4x mais rápido!)
            height: { ideal: 480 } 
          }
        }).catch(() => {
          return navigator.mediaDevices.getUserMedia({ video: true });
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setLoading(false);
        setStatusTexto('Aponte para o display do termômetro');

        // Loop de processamento otimizado
        intervaloProcessamento = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current || !ativo || processandoQuadro) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

          processandoQuadro = true; // Bloqueia novas execuções até terminar esta

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Corta uma região central bem focada (ROI)
          const larguraCorte = canvas.width * 0.5;
          const alturaCorte = canvas.height * 0.25;
          const xCorte = (canvas.width - larguraCorte) / 2;
          const yCorte = (canvas.height - alturaCorte) / 2;

          const imagemItem = ctx.getImageData(xCorte, yCorte, larguraCorte, alturaCorte);
          const d = imagemItem.data;

          // 🔥 FILTRO DE BINARIZAÇÃO DE ALTO CONTRASTE (PRETO E BRANCO PURO)
          // Como os números são brancos e brilhantes, isolamos pixels de alta luminosidade
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i+1];
            const b = d[i+2];
            
            // Fórmula de luminosidade perceptível
            const luminosidade = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Se o pixel for brilhante (número), vira Branco Puro. Se for escuro, vira Preto Absoluto.
            const valorBinario = luminosidade > 160 ? 255 : 0; 
            
            d[i] = valorBinario;     
            d[i+1] = valorBinario;   
            d[i+2] = valorBinario;   
          }
          
          const canvasTratado = document.createElement('canvas');
          canvasTratado.width = larguraCorte;
          canvasTratado.height = alturaCorte;
          canvasTratado.getContext('2d')?.putImageData(imagemItem, 0, 0);

          // Executa o OCR na imagem limpa de ruídos
          const { data: { text } } = await worker.recognize(canvasTratado);
          
          // Tratamento de string agressivo para limpar falsos espaços ou caracteres fantasmas
          const textoLimpo = text.replace(/[^0-9.-]/g, '');

          // Captura padrões como 30.1, 34.2, 35.5 ou negativos -10.5
          const regexTermometro = /(-?\d{1,2}\.\d)/;
          const resultado = textoLimpo.match(regexTermometro);

          if (resultado && resultado[1]) {
            const valorDetectado = parseFloat(resultado[1]);
            
            if (valorDetectado >= -50 && valorDetectado <= 100) {
              clearInterval(intervaloProcessamento);
              await worker.terminate();
              stream.getTracks().forEach(track => track.stop());
              onCaptura(valorDetectado);
              return;
            }
          }

          processandoQuadro = false; // Libera para o próximo quadro se não capturou
        }, 800); // Frequência reduzida para 800ms (Mais tentativas por minuto de forma leve)

      } catch (err) {
        console.error(err);
        setStatusTexto('Erro ao iniciar scanner óptico.');
      }
    }

    iniciarCameraEReconhecimento();

    return () => {
      ativo = false;
      if (intervaloProcessamento) clearInterval(intervaloProcessamento);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onCaptura]);

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

        {/* MIRA DO SCANNER */}
        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
          <div className="w-[60%] aspect-2.5/1 border-4 border-emerald-500 rounded-2xl flex justify-center items-center bg-black/10">
            <span className="text-[9px] text-white font-black bg-emerald-600 px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">Enquadre o Número Central</span>
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