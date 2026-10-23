// src/pages/AuditoriaPrecificacao/index.tsx
import { useEffect, useState } from 'react';
import { AbaAuditar } from './components/AbaAuditar';
import { AbaEtiquetas } from './components/AbaEtiquetas';
import { AbaAnalises } from './components/AbaAnalises';
import { auditoriaService } from './services/auditoriaService';

interface AuditoriaPrecificacaoProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

type AbaPrincipal = 'AUDITAR' | 'ETIQUETAS' | 'ANALISES';

export default function AuditoriaPrecificacao({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: AuditoriaPrecificacaoProps) {
  const idUsuario = usuarioLogadoId || usuarioLogado?.id || '';
  const [aba, setAba] = useState<AbaPrincipal>('AUDITAR');
  const [etiquetasPendentes, setEtiquetasPendentes] = useState(0);

  // Atualiza o contador de etiquetas sempre que a tela muda de aba
  useEffect(() => {
    auditoriaService
      .contarEtiquetasPendentes()
      .then(setEtiquetasPendentes)
      .catch((err) => console.error(err));
  }, [aba]);

  const rotulos: Array<{ id: AbaPrincipal; texto: string }> = [
    { id: 'AUDITAR', texto: 'Auditar' },
    { id: 'ETIQUETAS', texto: `Etiquetas${etiquetasPendentes > 0 ? ` (${etiquetasPendentes})` : ''}` },
    { id: 'ANALISES', texto: 'Análises' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto font-sans select-none">
      <div className="max-w-6xl mx-auto p-3 sm:p-6 flex flex-col gap-4 pb-16">
        <header className="bg-white rounded-3xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onVoltarParaHome && (
              <button
                type="button"
                onClick={onVoltarParaHome}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 active:scale-95 transition-all"
                title="Voltar para a Home"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="text-[#09797a] font-black text-base uppercase">Auditoria de Precificação</h1>
              <p className="text-[11px] text-slate-500 font-medium">Conferência de preços na gôndola por seção ou corredor</p>
            </div>
          </div>

          <nav className="flex gap-2 flex-wrap">
            {rotulos.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setAba(r.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${
                  aba === r.id ? 'bg-[#09797a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {r.texto}
              </button>
            ))}
          </nav>
        </header>

        {aba === 'AUDITAR' && (
          <AbaAuditar usuarioId={idUsuario} onFinalizada={() => setAba('ANALISES')} />
        )}
        {aba === 'ETIQUETAS' && <AbaEtiquetas onContagemAlterada={setEtiquetasPendentes} />}
        {aba === 'ANALISES' && <AbaAnalises />}
      </div>
    </div>
  );
}
