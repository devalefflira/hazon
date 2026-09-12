// src/pages/Solicitacoes/components/NovaSolicitacao.tsx
import { useState, useEffect } from 'react';
import { solicitacoesService } from '../services/solicitacoesService';
import { 
  TIPOS_SOLICITACAO, 
  type TipoSolicitacao, 
  type ItemSolicitacaoForm 
} from '../types/solicitacoes.types';

interface Props {
  usuarioId: string;
  nomeUsuario: string;
  onVoltar: () => void;
  onSalvoSucesso: () => void;
}

export default function NovaSolicitacao({ usuarioId, nomeUsuario, onVoltar, onSalvoSucesso }: Props) {
  const [destinatarios, setDestinatarios] = useState<Array<{ id: string; nome: string; setor: string }>>([]);
  const [destinatarioId, setDestinatarioId] = useState('');
  const [tipoSolicitacao, setTipoSolicitacao] = useState<TipoSolicitacao>('Produto');
  const [finalidade, setFinalidade] = useState('');
  const [descricaoGeral, setDescricaoGeral] = useState('');

  // Estados exclusivos para o fluxo de Produto
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [observacaoItem, setObservacaoItem] = useState('');
  const [itensSolicitados, setItensSolicitados] = useState<ItemSolicitacaoForm[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [carregandoDest, setCarregandoDest] = useState(true);

  const dataAtualFormatada = new Date().toLocaleDateString('pt-BR');
  const horaAtualFormatada = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    async function carregarDestinatarios() {
      try {
        setCarregandoDest(true);
        const lista = await solicitacoesService.listarDestinatarios();
        // Filtra para não listar a si próprio como destinatário primário
        const outrosUsuarios = lista.filter((u) => u.id !== usuarioId);
        setDestinatarios(outrosUsuarios);
        if (outrosUsuarios.length > 0) {
          setDestinatarioId(outrosUsuarios[0].id);
        }
      } catch (err) {
        console.error('Erro ao listar destinatários:', err);
      } finally {
        setCarregandoDest(false);
      }
    }
    carregarDestinatarios();
  }, [usuarioId]);

  const handleBuscarProdutos = async (termo: string) => {
    setTermoBusca(termo);
    if (!termo.trim()) {
      setProdutosEncontrados([]);
      return;
    }
    try {
      const prods = await solicitacoesService.buscarProdutos(termo);
      setProdutosEncontrados(prods);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelecionarProduto = (p: any) => {
    setProdutoSelecionado(p);
    setTermoBusca(`${p.codprod} - ${p.descricao}`);
    setProdutosEncontrados([]);
  };

  const handleAdicionarItem = () => {
    if (!produtoSelecionado) {
      alert('Selecione um produto da lista.');
      return;
    }
    if (quantidade <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }

    const novoItem: ItemSolicitacaoForm = {
      produto_id: produtoSelecionado.id,
      codprod: produtoSelecionado.codprod,
      descricao: produtoSelecionado.descricao,
      quantidade,
      unidade_medida: produtoSelecionado.unidade || 'UN',
      observacao: observacaoItem.trim() || undefined
    };

    setItensSolicitados((prev) => [...prev, novoItem]);
    setProdutoSelecionado(null);
    setTermoBusca('');
    setQuantidade(1);
    setObservacaoItem('');
  };

  const handleRemoverItem = (index: number) => {
    setItensSolicitados((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSalvar = async () => {
    if (!destinatarioId) {
      alert('Selecione para quem a solicitação deve ser enviada.');
      return;
    }
    if (!finalidade.trim()) {
      alert('O campo Finalidade é obrigatório.');
      return;
    }
    if (tipoSolicitacao === 'Produto' && itensSolicitados.length === 0) {
      alert('Adicione pelo menos um produto à lista.');
      return;
    }
    if (tipoSolicitacao !== 'Produto' && !descricaoGeral.trim()) {
      alert('Descreva detalhadamente o item ou serviço solicitado.');
      return;
    }

    try {
      setSalvando(true);
      await solicitacoesService.criarSolicitacao({
        solicitante_id: usuarioId,
        destinatario_id: destinatarioId,
        tipo_solicitacao: tipoSolicitacao,
        finalidade: finalidade.trim(),
        descricao_geral: tipoSolicitacao !== 'Produto' ? descricaoGeral.trim() : undefined,
        itens: tipoSolicitacao === 'Produto' ? itensSolicitados : []
      });

      alert('Solicitação registrada com sucesso!');
      onSalvoSucesso();
    } catch (err: any) {
      alert(`Erro ao salvar solicitação: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-5 sm:p-8 flex flex-col gap-6">
        
        {/* Topo / Voltar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltar}
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all cursor-pointer"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Nova Solicitação Interna
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Envio de pedidos de produtos, materiais, EPIs ou serviços
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-teal-50 text-[#09797a] border border-teal-200">
            Nova
          </span>
        </div>

        {/* Metadados Automáticos & Destinatário */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
              Solicitante (Você)
            </label>
            <input
              type="text"
              readOnly
              value={nomeUsuario || 'Usuário Atual'}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
              Data e Hora do Registro
            </label>
            <input
              type="text"
              readOnly
              value={`${dataAtualFormatada} às ${horaAtualFormatada}`}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#09797a] block mb-1">
              * Solicitar para (Destinatário)
            </label>
            {carregandoDest ? (
              <div className="text-xs font-bold text-slate-400 py-2">Carregando usuários...</div>
            ) : (
              <select
                value={destinatarioId}
                onChange={(e) => setDestinatarioId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:border-[#09797a]"
              >
                {destinatarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {u.setor ? `(${u.setor})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tipo de Solicitação */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700">
            Tipo de Solicitação
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TIPOS_SOLICITACAO.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoSolicitacao(tipo)}
                className={`py-3 px-2 rounded-2xl border text-xs font-black uppercase transition-all flex items-center justify-center text-center cursor-pointer ${
                  tipoSolicitacao === tipo
                    ? 'bg-[#09797a] text-white border-[#09797a] shadow-md shadow-teal-900/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        {/* Finalidade (Obrigatório) */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1">
            * Finalidade da Solicitação (Para que será utilizado?)
          </label>
          <textarea
            rows={2}
            value={finalidade}
            onChange={(e) => setFinalidade(e.target.value)}
            placeholder="Descreva claramente o motivo ou justificativa desta solicitação..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#09797a]"
          />
        </div>

        {/* FLUXO SE TIPO FOR PRODUTO */}
        {tipoSolicitacao === 'Produto' ? (
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Produtos Solicitados
            </span>

            {/* Input de Busca de Produto */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex flex-col gap-3">
              <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Pesquisar Produto no Estoque (Cód, Barras ou Descrição %)
                </label>
                <input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => handleBuscarProdutos(e.target.value)}
                  placeholder="Digite o código ou nome do produto..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                />

                {produtosEncontrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 flex flex-col">
                    {produtosEncontrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelecionarProduto(p)}
                        className="p-2.5 text-left border-b border-slate-100 hover:bg-teal-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <span className="font-black text-slate-800 uppercase">{p.descricao}</span>
                          <span className="text-[10px] text-slate-400 ml-2">Cód: {p.codprod}</span>
                        </div>
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                          {p.unidade || 'UN'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Quantidade Desejada
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Observação do Item (Opcional)
                  </label>
                  <input
                    type="text"
                    value={observacaoItem}
                    onChange={(e) => setObservacaoItem(e.target.value)}
                    placeholder="Ex: Urgente para reposição da ilha"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAdicionarItem}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                + Adicionar Produto à Lista
              </button>
            </div>

            {/* Listagem dos Itens Adicionados */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase text-slate-400 px-1">
                Itens na Solicitação ({itensSolicitados.length})
              </span>

              {itensSolicitados.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  Nenhum produto adicionado ainda.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {itensSolicitados.map((it, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 uppercase">
                          {it.descricao}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Quantidade: <strong>{it.quantidade} {it.unidade_medida}</strong>
                          {it.observacao ? ` • Obs: "${it.observacao}"` : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoverItem(idx)}
                        className="text-red-500 hover:text-red-700 font-black text-sm p-1.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* FLUXO SE TIPO FOR DIFERENTE DE PRODUTO */
          <div className="border-t border-slate-100 pt-4">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1">
              * Descrição Detalhada do Pedido / Serviço
            </label>
            <textarea
              rows={4}
              value={descricaoGeral}
              onChange={(e) => setDescricaoGeral(e.target.value)}
              placeholder={`Especifique o que precisa em ${tipoSolicitacao} (marcas, modelos, tamanhos, reparos específicos)...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#09797a]"
            />
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onVoltar}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase cursor-pointer hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={handleSalvar}
            className="px-6 py-2.5 rounded-xl bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white font-black text-xs uppercase shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {salvando ? 'Salvando...' : 'Salvar Solicitação'}
          </button>
        </div>

      </div>
    </div>
  );
}