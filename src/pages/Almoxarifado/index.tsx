import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { almoxarifadoService } from './services/almoxarifadoService';
import type { AlmoxarifadoItem, AlmoxarifadoControle } from './types/almoxarifado.types';
import { CadastrarItemModal } from './components/CadastrarItemModal';
import { NovoControleModal } from './components/NovoControleModal';

interface Props {
  onVoltarParaHome?: () => void;
}

export const AlmoxarifadoPage: React.FC<Props> = ({ onVoltarParaHome }) => {
  const [abaPrincipal, setAbaPrincipal] = useState<'controles' | 'itens'>('controles');
  const [subAbaItens, setSubAbaItens] = useState<'listagem' | 'contagem'>('listagem');
  const [subAbaControles, setSubAbaControles] = useState<'em_andamento' | 'finalizados'>('em_andamento');

  const [itens, setItens] = useState<AlmoxarifadoItem[]>([]);
  const [controles, setControles] = useState<AlmoxarifadoControle[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Modais
  const [modalItemAberto, setModalItemAberto] = useState(false);
  const [modalControleAberto, setModalControleAberto] = useState(false);

  // Edição de estoque na contagem
  const [estoquesEdicao, setEstoquesEdicao] = useState<{ [id: string]: number }>({});

  const carregarDados = async () => {
    try {
      setCarregando(true);
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
    } finally {
      setCarregando(false);
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
    <div className="min-h-screen bg-slate-100 p-2 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-4">
        
        {/* CABEÇALHO DO MÓDULO */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            {onVoltarParaHome && (
              <button
                type="button"
                onClick={onVoltarParaHome}
                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-600 hover:text-[#09797a] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 flex-shrink-0"
                title="Voltar ao Painel Principal"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-[#09797a]" />
                <h1 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">
                  Almoxarifado & Insumos
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Gestão e cautela de bobinas, fitas, chamex e materiais internos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalControleAberto(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[#09797a] hover:bg-[#075f60] text-white font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Novo Controle
          </button>
        </div>

        {/* ABAS PRINCIPAIS */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            type="button"
            onClick={() => setAbaPrincipal('controles')}
            className={`pb-2.5 font-black text-xs sm:text-sm uppercase tracking-wide transition-all border-b-2 cursor-pointer ${
              abaPrincipal === 'controles'
                ? 'border-[#09797a] text-[#09797a]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Controles
          </button>
          <button
            type="button"
            onClick={() => setAbaPrincipal('itens')}
            className={`pb-2.5 font-black text-xs sm:text-sm uppercase tracking-wide transition-all border-b-2 cursor-pointer ${
              abaPrincipal === 'itens'
                ? 'border-[#09797a] text-[#09797a]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Itens
          </button>
        </div>

        {/* ================= ABA DE CONTROLES ================= */}
        {abaPrincipal === 'controles' && (
          <div className="space-y-4">
            {/* SUB-ABAS DE CONTROLES */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-fit gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSubAbaControles('em_andamento')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  subAbaControles === 'em_andamento'
                    ? 'bg-white shadow-xs text-amber-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Em Andamento (Saíram e Devem Voltar)</span>
              </button>
              <button
                type="button"
                onClick={() => setSubAbaControles('finalizados')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  subAbaControles === 'finalizados'
                    ? 'bg-white shadow-xs text-teal-800'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#09797a] flex-shrink-0" />
                <span>Finalizados (Apenas Saída / Retornados)</span>
              </button>
            </div>

            {/* TABELA RESPONSIVA COM ROLAGEM HORIZONTAL */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-center">Qtd Retirada</th>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Encarregado</th>
                      <th className="px-4 py-3">Data / Hora Saída</th>
                      <th className="px-4 py-3 text-center">Tipo</th>
                      {subAbaControles === 'em_andamento' && <th className="px-4 py-3 text-center">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {controles.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-medium">
                          {carregando ? 'A carregar dados...' : 'Nenhum registo encontrado nesta secção.'}
                        </td>
                      </tr>
                    ) : (
                      controles.map((c) => (
                        <tr key={c.id} className="hover:bg-teal-50/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-500">{c.codigo_customizado}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{c.item?.descricao || '-'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800 font-mono">
                            {c.quantidade_retirada} {c.item?.unidade_medida}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{c.colaborador_retirou}</td>
                          <td className="px-4 py-3 text-slate-500">{c.encarregado?.nome || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(c.data_registro + 'T' + c.hora_registro).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.apenas_saida ? (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-bold text-[10px] uppercase">
                                Apenas Saída
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold text-[10px] uppercase">
                                Retornável
                              </span>
                            )}
                          </td>
                          {subAbaControles === 'em_andamento' && (
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRegistrarRetorno(c)}
                                className="px-3 py-1.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                              >
                                Registar Retorno
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA DE ITENS ================= */}
        {abaPrincipal === 'itens' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-fit gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSubAbaItens('listagem')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    subAbaItens === 'listagem' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Listagem (Item e Estoque)
                </button>
                <button
                  type="button"
                  onClick={() => setSubAbaItens('contagem')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    subAbaItens === 'contagem' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Contar / Atualizar Estoque
                </button>
              </div>

              <button
                type="button"
                onClick={() => setModalItemAberto(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 uppercase tracking-wide"
              >
                <Plus className="w-4 h-4 text-teal-400" />
                Cadastrar Item
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Unidade</th>
                      <th className="px-4 py-3 text-right">Estoque Atual</th>
                      {subAbaItens === 'contagem' && <th className="px-4 py-3 text-center">Nova Contagem</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {itens.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                          {carregando ? 'A carregar dados...' : 'Nenhum item registado no almoxarifado.'}
                        </td>
                      </tr>
                    ) : (
                      itens.map((item) => (
                        <tr key={item.id} className="hover:bg-teal-50/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.codigo_item}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{item.descricao}</td>
                          <td className="px-4 py-3 text-slate-500">{item.unidade_medida}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900 font-mono text-sm">{item.estoque_atual}</td>
                          {subAbaItens === 'contagem' && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={String(item.estoque_atual)}
                                  defaultValue={estoquesEdicao[item.id] ?? item.estoque_atual}
                                  onChange={(e) =>
                                    setEstoquesEdicao({ ...estoquesEdicao, [item.id]: parseFloat(e.target.value) })
                                  }
                                  className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#09797a]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSalvarContagem(item)}
                                  className="p-1.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                                  title="Gravar Contagem"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modais em Janela Cheia */}
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