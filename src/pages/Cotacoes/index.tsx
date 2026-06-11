import { useState } from 'react';
import NovaCotacao from './NovaCotacao';

interface CotacoesProps {
  onVoltarParaHome: () => void;
  usuarioLogado: { id: string; nome: string; perfil: string };
}

type ViewState = 'dashboard' | 'nova-cotacao';

export default function Cotacoes({ onVoltarParaHome, usuarioLogado }: CotacoesProps) {
  const [view, setView] = useState<ViewState>('dashboard');

  if (view === 'nova-cotacao') {
    return (
      <NovaCotacao 
        compradorId={usuarioLogado.id} 
        onVoltar={() => setView('dashboard')}
        onSucesso={() => setView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-[#09797a] text-white p-4 flex items-center gap-3 shadow-md">
        <button onClick={onVoltarParaHome} className="text-xl font-bold p-1">←</button>
        <h1 className="text-lg font-bold">Cotações</h1>
      </div>

      <div className="p-4 flex-1">
        {/* Futuro: Lista de Cotações em Andamento virá aqui */}
        
        <button 
          onClick={() => setView('nova-cotacao')}
          className="w-full bg-[#09797a] text-white py-4 rounded-2xl text-sm font-bold shadow-md flex justify-center items-center gap-2 mt-4"
        >
          <span className="text-lg leading-none">+</span> Nova Cotação
        </button>
      </div>
    </div>
  );
}