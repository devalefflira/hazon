import { useState, useEffect } from 'react';
import { inventarioService } from './services/inventarioService';
import CapturaItem from './components/CapturaItem';

interface InventarioProps {
  usuarioId: string;
  onVoltarParaHome: () => void;
}

export default function Inventario({ usuarioId, onVoltarParaHome }: InventarioProps) {
  const [inventarios, setInventarios] = useState<any[]>([]);
  const [inventarioAtivo, setInventarioAtivo] = useState<any>(null);

  useEffect(() => { carregarLista(); }, []);

  const carregarLista = async () => {
    const dados = await inventarioService.listarInventarios();
    setInventarios(dados || []);
  };

  const handleNovoInventario = () => setInventarioAtivo({ id: 'TEMPORARIO' });

  // Formata hora localmente para evitar o erro do UTC do Supabase
  const formatarHora = (hora: string) => {
    if (!hora) return "--:--";
    // Cria um objeto data fake para converter o formato time do banco
    const [h, m] = hora.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 min-h-150">
        <div className="flex items-center mb-6 border-b pb-4">
          <button onClick={inventarioAtivo ? () => setInventarioAtivo(null) : onVoltarParaHome} className="mr-2 text-xl">⬅️</button>
          <h1 className="text-[#09797a] font-bold text-xl">Inventário</h1>
        </div>

        {inventarioAtivo ? (
          <CapturaItem 
            inventarioId={inventarioAtivo.id} 
            usuarioId={usuarioId}
            onFinalizar={() => { setInventarioAtivo(null); carregarLista(); }} 
            onCancelar={() => setInventarioAtivo(null)} 
          />
        ) : (
          <div className="flex flex-col gap-3">
            <button onClick={handleNovoInventario} className="w-full bg-[#09797a] text-white py-4 rounded-2xl font-bold">+ Iniciar Nova Contagem</button>
            <div className="flex flex-col gap-2 mt-4">
              {inventarios.map(inv => (
                <div key={inv.id} className="p-4 border rounded-2xl bg-white shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{inv.codigo_customizado}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">
                      {new Date(inv.data_registro).toLocaleDateString('pt-BR')} às {formatarHora(inv.hora_registro)}
                    </p>
                    <p className="text-[10px] text-gray-400">Responsável: {inv.usuarios?.nome || 'N/A'}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${inv.status === 'Finalizado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inv.status}
                    </span>
                  </div>
                  {/* Botão Abrir disponível para consulta em ambos os status */}
                  <button onClick={() => setInventarioAtivo(inv)} className="text-[#e07a5f] font-bold text-xs bg-orange-50 px-3 py-1 rounded-lg">Abrir</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}