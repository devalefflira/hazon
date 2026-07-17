import { useState } from 'react';
import { useCategorias } from '../../../hooks/useCategorias';
import { produtosService } from '../services/produtosService';
import LeitorCodigoBarras from './LeitorCodigoBarras'; // Importação do novo componente

interface CadastroProdutoProps {
  onSucesso: () => void;
  onCancelar: () => void;
}

export default function CadastroProduto({ onSucesso, onCancelar }: CadastroProdutoProps) {
  const { setores, subsetores, unidades, carregarSubsetores } = useCategorias();
  const [lendo, setLendo] = useState(false); // Estado para controlar o modal do leitor
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    ean: '',
    descricao: '',
    unidade_id: '',
    setor_id: '',
    subsetor_id: ''
  });

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await produtosService.salvarProduto({
        codigo_barras: formData.ean,
        descricao: formData.descricao,
        unidade_medida_id: formData.unidade_id,
        setor_id: formData.setor_id,
        subsetor_id: formData.subsetor_id
      });
      onSucesso();
    } catch (err) {
      alert("Erro ao salvar produto. Verifique se o EAN é único.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSalvar} className="w-full flex flex-col gap-4 animate-fadeIn">

      {/* AQUI ENTRA O LEITOR DE CÓDIGO DE BARRAS */}
      {lendo && (
        <LeitorCodigoBarras
          onLeituraSucesso={(codigo) => {
            setFormData(prev => ({ ...prev, ean: codigo }));
            setLendo(false);
          }}
          onFechar={() => setLendo(false)}
        />
      )}

      {/* Botão que ativa o leitor */}
      <button
        type="button"
        onClick={() => setLendo(true)}
        className="w-full bg-[#e07a5f] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
      >
        📷 Escanear Código de Barras
      </button>

      {/* Campos do Formulário */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">EAN (Código de Barras)</label>
        <input
          type="text" value={formData.ean} onChange={(e) => setFormData({ ...formData, ean: e.target.value })}
          className="bg-gray-50 border border-gray-300 p-3 rounded-xl w-full text-sm font-bold" required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Descrição</label>
        <input
          type="text" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          className="bg-gray-50 border border-gray-300 p-3 rounded-xl w-full text-sm" required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Unidade</label>
        <select
          className="bg-gray-50 border p-3 rounded-xl text-sm"
          onChange={(e) => setFormData({ ...formData, unidade_id: e.target.value })}
          required
        >
          <option value="">Selecione a Unidade...</option>
          { }
          {unidades && unidades.map(u => (
            <option key={u.id} value={u.id}>{u.sigla} - {u.descricao}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select className="bg-gray-50 border p-3 rounded-xl text-sm" onChange={(e) => {
          setFormData({ ...formData, setor_id: e.target.value });
          carregarSubsetores(e.target.value);
        }} required>
          <option value="">{setores.length > 0 ? 'Setor...' : 'Carregando...'}</option>
          {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <select className="bg-gray-50 border p-3 rounded-xl text-sm"
          disabled={!formData.setor_id}
          onChange={(e) => setFormData({ ...formData, subsetor_id: e.target.value })} required>
          <option value="">Subsetor...</option>
          {subsetores.map(sub => <option key={sub.id} value={sub.id}>{sub.nome}</option>)}
        </select>
      </div>

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={onCancelar} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-xs">Cancelar</button>
        <button type="submit" disabled={salvando} className="flex-1 bg-[#09797a] text-white py-3 rounded-xl font-bold text-xs shadow-md">
          {salvando ? 'Salvando...' : 'Cadastrar Produto'}
        </button>
      </div>
    </form>
  );
}