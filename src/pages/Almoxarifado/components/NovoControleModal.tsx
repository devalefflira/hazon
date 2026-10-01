import React, { useState, useEffect } from 'react';
import { X, ClipboardList, AlertCircle } from 'lucide-react';
import { almoxarifadoService } from '../services/almoxarifadoService';
import type { AlmoxarifadoItem } from '../types/almoxarifado.types';
import { supabase } from '../../../lib/supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NovoControleModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [itens, setItens] = useState<AlmoxarifadoItem[]>([]);
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string; setor: string }>>([]);

  const [itemId, setItemId] = useState('');
  const [estoqueDisponivel, setEstoqueDisponivel] = useState<number>(0);
  const [quantidadeRetirada, setQuantidadeRetirada] = useState<number>(1);
  const [apenasSaida, setApenasSaida] = useState(true);
  const [encarregadoId, setEncarregadoId] = useState('');
  const [colaboradorRetirou, setColaboradorRetirou] = useState('');

  const [dataHoraAtual, setDataHoraAtual] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItemId('');
      setEstoqueDisponivel(0);
      setQuantidadeRetirada(1);
      setApenasSaida(true);
      setColaboradorRetirou('');
      setErro(null);

      const agora = new Date();
      setDataHoraAtual(agora.toLocaleString('pt-BR'));

      almoxarifadoService.listarItens().then(setItens);

      supabase
        .from('usuarios')
        .select('id, nome, setor')
        .order('nome')
        .then(({ data }) => {
          if (data) {
            setUsuarios(data);
            if (data.length > 0) setEncarregadoId(data[0].id);
          }
        });
    }
  }, [isOpen]);

  const handleItemChange = (selectedId: string) => {
    setItemId(selectedId);
    const item = itens.find((i) => i.id === selectedId);
    setEstoqueDisponivel(item ? item.estoque_atual : 0);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId) {
      setErro('Selecione um item.');
      return;
    }
    if (quantidadeRetirada <= 0) {
      setErro('A quantidade retirada deve ser maior que zero.');
      return;
    }
    if (quantidadeRetirada > estoqueDisponivel) {
      setErro(`Quantidade retirada não pode ser superior ao estoque disponível (${estoqueDisponivel}).`);
      return;
    }
    if (!colaboradorRetirou.trim()) {
      setErro('Informe o nome do colaborador que retirou o item.');
      return;
    }

    try {
      setSalvando(true);
      setErro(null);
      await almoxarifadoService.criarControle({
        item_id: itemId,
        estoque_disponivel_momento: estoqueDisponivel,
        quantidade_retirada: quantidadeRetirada,
        apenas_saida: apenasSaida,
        encarregado_id: encarregadoId,
        colaborador_retirou: colaboradorRetirou
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao registrar saída do almoxarifado.');
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
            <ClipboardList className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold">Novo Controle de Retirada</h2>
              <p className="text-xs text-slate-400">Registro de saídas e cautelas de insumos</p>
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
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Item *</label>
                <select
                  required
                  value={itemId}
                  onChange={(e) => handleItemChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="">Selecione o insumo...</option>
                  {itens.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.codigo_item}] {it.descricao} (Saldo: {it.estoque_atual} {it.unidade_medida})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Estoque Disponível</label>
                <input
                  type="text"
                  disabled
                  value={estoqueDisponivel}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-bold text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Quantidade Retirada *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={quantidadeRetirada}
                  onChange={(e) => setQuantidadeRetirada(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="block text-sm font-bold text-slate-800">Apenas Saída?</span>
                  <span className="text-xs text-slate-500">
                    {apenasSaida ? 'Item consumido (não retornará)' : 'Item deverá voltar ao Almoxarifado'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setApenasSaida(!apenasSaida)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    apenasSaida ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      apenasSaida ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Encarregado Conferência *</label>
                <select
                  required
                  value={encarregadoId}
                  onChange={(e) => setEncarregadoId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.setor})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Colaborador que Retirou o Item *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo ou função"
                  value={colaboradorRetirou}
                  onChange={(e) => setColaboradorRetirou(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Data e Hora do Registro (Automático)</label>
              <input
                type="text"
                disabled
                value={dataHoraAtual}
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 text-sm cursor-not-allowed"
              />
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
                className="px-8 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition-colors shadow-sm disabled:opacity-50 text-sm"
              >
                {salvando ? 'Gravando...' : 'Gravar Controle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};