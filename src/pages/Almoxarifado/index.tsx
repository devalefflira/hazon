import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle, Clock } from 'lucide-react';
import { almoxarifadoService } from './services/almoxarifadoService';
import type { AlmoxarifadoItem, AlmoxarifadoControle } from './types/almoxarifado.types';
import { CadastrarItemModal } from './components/CadastrarItemModal';
import { NovoControleModal } from './components/NovoControleModal';

export const AlmoxarifadoPage: React.FC = () => {
  const [abaPrincipal, setAbaPrincipal] = useState<'itens' | 'controles'>('controles');
  const [subAbaItens, setSubAbaItens] = useState<'listagem' | 'contagem'>('listagem');
  const [subAbaControles, setSubAbaControles] = useState<'em_andamento' | 'finalizados'>('em_andamento');

  const [itens, setItens] = useState<AlmoxarifadoItem[]>([]);
  const [controles, setControles] = useState<AlmoxarifadoControle[]>([]);

  // Modais
  const [modalItemAberto, setModalItemAberto] = useState(false);
  const [modalControleAberto, setModalControleAberto] = useState(false);

  // Estados de ajuste rápido de contagem
  const [estoquesEdicao, setEstoquesEdicao] = useState<{ [id: string]: number }>({});

  const carregarDados = async () => {
    try {
      if (abaPrincipal === 'itens') {
        const dadosItens = await almoxarifadoService.listarItens();
        setItens(dadosItens);
      } else {
        const statusBusca = subAbaControles === 'em_andamento' ? 'Em Andamento' : 'Finalizado';
        const dadosControles = await almoxarifadoService.listarControles(statusBusca);
        setControles(dadosControles);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do almoxarifado:', err);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [abaPrincipal, subAbaControles]);

  const handleSalvarContagem = async (item: AlmoxarifadoItem) => {
    const novoValor = estoquesEdicao[item.id];
    if (novoValor === undefined || isNaN(novoValor)) return;

    try {
      await almoxarifadoService.atualizarEstoqueContagem(item.id, novoValor);
      await carregarDados();
      alert(`Estoque do item "${item.descricao}" atualizado com sucesso!`);
    } catch (err: any) {
      alert('Erro ao atualizar contagem: ' + err.message);
    }
  };

  const handleRegistrarRetorno = async (controle: AlmoxarifadoControle) => {
    if (!window.confirm(`Confirmar devolução do item "${controle.item?.descricao}" ao Almoxarifado?`)) return;

    try {
      await almoxarifadoService.registrarRetornoItem(
        controle.id,
        controle.item_id,
        controle.quantidade_retirada,
        controle.encarregado_id
      );
      carregarDados();
    } catch (err: any) {
      alert('Erro ao registrar retorno: ' + err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-7 h-7 text-amber-500" />
            Almoxarifado & Insumos
          </h1>
          <p className="text-sm text-slate-500">Gestão e cautela de bobinas, fitas, chamex e materiais internos</p>
        </div>

        <button
          onClick={() => setModalControleAberto(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Controle
        </button>
      </div>

      {/* Abas Principais */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setAbaPrincipal('controles')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            abaPrincipal === 'controles'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Controles
        </button>
        <button
          onClick={() => setAbaPrincipal('itens')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            abaPrincipal === 'itens'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Itens
        </button>
      </div>

      {/* CONTEÚDO: ABA ITENS */}
      {abaPrincipal === 'itens' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setSubAbaItens('listagem')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  subAbaItens === 'listagem' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}
              >
                Listagem (Item e Estoque)
              </button>
              <button
                onClick={() => setSubAbaItens('contagem')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  subAbaItens === 'contagem' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}
              >
                Contar / Atualizar Estoque
              </button>
            </div>

            <button
              onClick={() => setModalItemAberto(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Cadastrar Item
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Unidade</th>
                  <th className="px-6 py-3 text-right">Estoque Atual</th>
                  {subAbaItens === 'contagem' && <th className="px-6 py-3 text-center">Nova Contagem</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {itens.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-500">{item.codigo_item}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.descricao}</td>
                    <td className="px-6 py-4 text-slate-500">{item.unidade_medida}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">{item.estoque_atual}</td>
                    {subAbaItens === 'contagem' && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            step="any"
                            placeholder={String(item.estoque_atual)}
                            defaultValue={estoquesEdicao[item.id] ?? item.estoque_atual}
                            onChange={(e) =>
                              setEstoquesEdicao({ ...estoquesEdicao, [item.id]: parseFloat(e.target.value) })
                            }
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-center text-sm font-semibold"
                          />
                          <button
                            onClick={() => handleSalvarContagem(item)}
                            className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            title="Salvar Contagem"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO: ABA CONTROLES */}
      {abaPrincipal === 'controles' && (
        <div className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setSubAbaControles('em_andamento')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                subAbaControles === 'em_andamento' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Em Andamento (Saíram e Devem Voltar)
            </button>
            <button
              onClick={() => setSubAbaControles('finalizados')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                subAbaControles === 'finalizados' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Finalizados (Apenas Saída / Retornados)
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3 text-center">Qtd Retirada</th>
                  <th className="px-6 py-3">Colaborador que Retirou</th>
                  <th className="px-6 py-3">Encarregado</th>
                  <th className="px-6 py-3">Data / Hora Saída</th>
                  <th className="px-6 py-3 text-center">Tipo</th>
                  {subAbaControles === 'em_andamento' && <th className="px-6 py-3 text-center">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {controles.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-500">{c.codigo_customizado}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{c.item?.descricao || '-'}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                      {c.quantidade_retirada} {c.item?.unidade_medida}
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{c.colaborador_retirou}</td>
                    <td className="px-6 py-4 text-slate-500">{c.encarregado?.nome || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(c.data_registro + 'T' + c.hora_registro).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {c.apenas_saida ? (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold">
                          Apenas Saída
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-semibold">
                          Retornável
                        </span>
                      )}
                    </td>
                    {subAbaControles === 'em_andamento' && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRegistrarRetorno(c)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                        >
                          Registrar Retorno
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      <CadastrarItemModal
        isOpen={modalItemAberto}
        onClose={() => setModalItemAberto(false)}
        onSuccess={carregarDados}
      />
      <NovoControleModal
        isOpen={modalControleAberto}
        onClose={() => setModalControleAberto(false)}
        onSuccess={carregarDados}
      />
    </div>
  );
};