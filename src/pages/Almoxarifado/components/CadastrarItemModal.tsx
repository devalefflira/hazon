import React, { useState, useEffect } from 'react';
import { X, PackagePlus, AlertCircle } from 'lucide-react';
import { almoxarifadoService } from '../services/almoxarifadoService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CadastrarItemModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [codigoPrevisto, setCodigoPrevisto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [estoqueInicial, setEstoqueInicial] = useState<number>(0);
  const [unidadeMedida, setUnidadeMedida] = useState('UN');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDescricao('');
      setEstoqueInicial(0);
      setUnidadeMedida('UN');
      setErro(null);
      almoxarifadoService.gerarProximoCodigoItem().then(setCodigoPrevisto);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setErro('Informe a descrição do item.');
      return;
    }

    try {
      setSalvando(true);
      setErro(null);
      await almoxarifadoService.cadastrarItem({
        descricao,
        estoque_atual: Number(estoqueInicial),
        unidade_medida: unidadeMedida
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao cadastrar item.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between">
      <div className="w-full h-full bg-white flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <PackagePlus className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-bold">Cadastrar Novo Item de Almoxarifado</h2>
              <p className="text-xs text-slate-400">Insumos operacionais, bobinas, fitas e escritório</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </header>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full">
          {erro && (
            <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Código Item (Automático)</label>
                <input
                  type="text"
                  disabled
                  value={codigoPrevisto}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-mono text-sm font-bold cursor-not-allowed"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Descrição do Item *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bobina Térmica 80x40 Cupom Fiscal"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Inventário / Estoque Atual *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={estoqueInicial}
                  onChange={(e) => setEstoqueInicial(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Unidade de Medida</label>
                <select
                  value={unidadeMedida}
                  onChange={(e) => setUnidadeMedida(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="UN">UN (Unidade / Caixa / Rolo)</option>
                  <option value="CX">CX (Caixa)</option>
                  <option value="PCT">PCT (Pacote)</option>
                  <option value="RESMA">RESMA</option>
                  <option value="KG">KG (Quilo)</option>
                </select>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-8 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-sm disabled:opacity-50 text-sm"
              >
                {salvando ? 'Salvando...' : 'Salvar Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};