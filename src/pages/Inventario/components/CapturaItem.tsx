import { useState, useEffect } from 'react';
import { inventarioService } from '../services/inventarioService';

interface CapturaItemProps {
  inventarioId: string;
  usuarioId: string;
  onFinalizar: () => void;
  onCancelar: () => void;
}

export default function CapturaItem({ inventarioId, usuarioId, onFinalizar, onCancelar }: CapturaItemProps) {
  const [locais, setLocais] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [produto, setProduto] = useState<any>(null);
  const [busca, setBusca] = useState('');
  const [currentId, setCurrentId] = useState(inventarioId);
  const [formData, setFormData] = useState({ qtd: 1, mult: 1, lote: '', validade: '', local_id: '' });

  useEffect(() => {
    inventarioService.listarLocais().then(setLocais);
    if (currentId !== 'TEMPORARIO') carregarItens();
  }, [currentId]);

  const carregarItens = async () => {
    const dados = await inventarioService.listarItensDoInventario(currentId);
    setItens(dados);
  };

  const handleBusca = async (termo: string) => {
    setBusca(termo);
    if (termo.length > 2) {
      const prod = await inventarioService.buscarProduto(termo);
      setProduto(prod);
    } else {
      setProduto(null);
    }
  };

  const handleSalvarItem = async () => {
    if (!produto || !formData.local_id) return alert("Selecione local e produto!");
    
    let targetId = currentId;
    if (targetId === 'TEMPORARIO') {
        const codigo = `INV-${new Date().getTime().toString().slice(-6)}`;
        const novo = await inventarioService.criarNovoInventario(codigo, usuarioId);
        targetId = novo.id;
        setCurrentId(targetId);
    }

    await inventarioService.salvarItemInventario({
      inventario_id: targetId, produto_id: produto.id,
      quantidade: formData.qtd, multiplicador: formData.mult,
      local_captura_id: formData.local_id, lote: formData.lote, validade: formData.validade
    });
    
    setBusca(''); setProduto(null); 
    setFormData(prev => ({ ...prev, qtd: 1, mult: 1, lote: '', validade: '' })); // Local_id preservado
    carregarItens();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button onClick={onCancelar} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold">Voltar</button>
        <button onClick={onFinalizar} className="flex-1 bg-[#e07a5f] text-white py-3 rounded-xl font-bold">Salvar Inventário</button>
      </div>

      <select className="w-full bg-gray-50 p-3 rounded-xl border" value={formData.local_id} onChange={(e) => setFormData({...formData, local_id: e.target.value})}>
        <option value="">Selecione o Local...</option>
        {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
      </select>

      <input type="text" placeholder="Buscar produto..." value={busca} onChange={(e) => handleBusca(e.target.value)} className="border p-3 rounded-xl" />
      {produto && <div className="bg-emerald-50 p-3 rounded-xl font-bold text-emerald-800">{produto.descricao}</div>}

      <div className="grid grid-cols-2 gap-2">
        <input type="number" placeholder="Qtd" value={formData.qtd} onChange={(e) => setFormData({...formData, qtd: Number(e.target.value)})} className="border p-3 rounded-xl" />
        <input type="number" placeholder="Mult" value={formData.mult} onChange={(e) => setFormData({...formData, mult: Number(e.target.value)})} className="border p-3 rounded-xl" />
      </div>

      <input type="text" placeholder="Lote (ex: LOTE123)" value={formData.lote} onChange={(e) => setFormData({...formData, lote: e.target.value})} className="border p-3 rounded-xl" />
      <input type="date" value={formData.validade} onChange={(e) => setFormData({...formData, validade: e.target.value})} className="border p-3 rounded-xl" />

      <button onClick={handleSalvarItem} className="w-full bg-[#09797a] text-white py-4 rounded-xl font-bold">Confirmar Item</button>

      <div className="mt-4 border-t pt-4">
        <h3 className="font-bold mb-2">Itens contados:</h3>
        {itens.map(item => (
          <div key={item.id} className="flex justify-between p-2 border-b text-sm">
            <span>{item.produtos?.descricao} - {item.quantidade_contabilizada} UN</span>
            <button onClick={() => inventarioService.deletarItem(item.id).then(carregarItens)} className="text-red-500">Apagar</button>
          </div>
        ))}
      </div>
    </div>
  );
}