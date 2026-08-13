// Arquivo: src/pages/Orcamentos/index.tsx
import { useState, useEffect } from 'react';
import { orcamentosService } from './services/orcamentosService';
import { gerarPdfOrcamento } from './utils/gerarPdfOrcamento';

interface OrcamentosProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

const UNIDADES_OPCOES = ['UN', 'CX', 'FD', 'SC', 'PC'];

export default function Orcamentos({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: OrcamentosProps) {
  const idUsuarioFinal = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;

  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'PENDENTES' | 'CONCLUIDOS'>('PENDENTES');

  // Tela de Criação / Edição de Orçamento
  const [emEdicao, setEmEdicao] = useState(false);
  const [codigoOrcamentoAtual, setCodigoOrcamentoAtual] = useState<string | null>(null);

  // Busca Autocomplete de Clientes
  const [termoBuscaCliente, setTermoBuscaCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);

  // Campos de Dados do Cliente
  const [clienteNome, setClienteNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cidade, setCidade] = useState('Bom Jesus das Selvas');
  const [estado, setEstado] = useState('Maranhão');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [numero, setNumero] = useState('');
  const [pontoReferencia, setPontoReferencia] = useState('');
  const [pastaCliente, setPastaCliente] = useState('Geral');
  const [whatsapp, setContatoWhatsapp] = useState('');

  // Busca e Seleção do Produto
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);

  // Regra de Desconto, Preço e Embalagem (Campos de desconto salvos como number | '' para permitirem input limpo)
  const [modoDesconto, setModoDesconto] = useState<'SEM_DESCONTO' | 'PERCENTUAL' | 'MANUAL'>('SEM_DESCONTO');
  const [percentualDesconto, setPercentualDesconto] = useState<number | ''>('');
  const [precoFinalManual, setPrecoFinalManual] = useState<number | ''>('');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [unidade, setUnidade] = useState<string>('UN');
  const [embalagem, setEmbalagem] = useState<number | ''>(1);

  // Controle de edição inline de item
  const [tempIdItemEdicao, setTempIdItemEdicao] = useState<string | null>(null);

  // Itens do Orçamento
  const [itensAdicionados, setItensAdicionados] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Modal de Detalhes
  const [orcamentoDetalhe, setOrcamentoDetalhe] = useState<any | null>(null);

  const carregarOrcamentos = async () => {
    try {
      setLoading(true);
      const dados = await orcamentosService.listarOrcamentos();
      setOrcamentos(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOrcamentos();
  }, []);

  // Autocomplete de Clientes
  useEffect(() => {
    if (!termoBuscaCliente.trim() || clienteSelecionado) {
      setClientesEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await orcamentosService.buscarClientes(termoBuscaCliente);
        setClientesEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBuscaCliente, clienteSelecionado]);

  // Autocomplete de Produtos
  useEffect(() => {
    if (!termoBuscaProduto.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await orcamentosService.buscarProdutos(termoBuscaProduto);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBuscaProduto, produtoSelecionado]);

  // Reseta Embalagem para 1 caso unidade seja "UN"
  useEffect(() => {
    if (unidade === 'UN') {
      setEmbalagem(1);
    }
  }, [unidade]);

  // Cálculo e Pré-visualização do Preço e do Desconto
  const precoTabela = Number(produtoSelecionado?.pvenda || 0);

  let precoFinalCalculado = precoTabela;
  let percentualAplicadoCalculado = 0;

  if (modoDesconto === 'SEM_DESCONTO') {
    precoFinalCalculado = precoTabela;
    percentualAplicadoCalculado = 0;
  } else if (modoDesconto === 'PERCENTUAL') {
    percentualAplicadoCalculado = Number(percentualDesconto || 0);
    const valorDesc = (precoTabela * percentualAplicadoCalculado) / 100;
    precoFinalCalculado = Math.max(0, precoTabela - valorDesc);
  } else if (modoDesconto === 'MANUAL') {
    const vManual = Number(precoFinalManual);
    precoFinalCalculado = precoFinalManual !== '' && vManual >= 0 ? vManual : precoTabela;
    if (precoTabela > 0) {
      percentualAplicadoCalculado = ((precoTabela - precoFinalCalculado) / precoTabela) * 100;
    }
  }

  const numQtd = Number(quantidade || 1);
  const numEmb = Number(embalagem || 1);
  const quantidadeRealTotal = numQtd * (unidade === 'UN' ? 1 : numEmb);
  const subtotalItem = precoFinalCalculado * quantidadeRealTotal;

  // Selecionar Cliente do Autocomplete
  const handleSelecionarCliente = (cli: any) => {
    setClienteSelecionado(cli);
    setClienteNome(cli.nome || '');
    setCpfCnpj(cli.cpf_cnpj || '');
    setCidade(cli.cidade || 'Bom Jesus das Selvas');
    setEstado(cli.estado || 'Maranhão');
    setEndereco(cli.endereco || '');
    setBairro(cli.bairro || '');
    setNumero(cli.numero || '');
    setPontoReferencia(cli.ponto_referencia || '');
    setPastaCliente(cli.pasta || 'Geral');
    setContatoWhatsapp(cli.contato_whatsapp || '');
    setTermoBuscaCliente(cli.nome);
    setClientesEncontrados([]);
  };

  // Adicionar ou Atualizar Item na Lista Temporária
  const handleAdicionarOuAtualizarItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione um produto válido.');
      return;
    }

    const novoItem = {
      temp_id: tempIdItemEdicao || Math.random().toString(),
      produto_id: produtoSelecionado.id,
      codprod: produtoSelecionado.codprod,
      descricao: produtoSelecionado.descricao,
      unidade_medida: unidade,
      quantidade: numQtd,
      embalagem: unidade === 'UN' ? 1 : numEmb,
      preco_custo_unitario: Number(produtoSelecionado.custoreal || 0),
      preco_venda_tabela: precoTabela,
      percentual_desconto: Number(percentualAplicadoCalculado.toFixed(2)),
      preco_final_unitario: precoFinalCalculado,
      valor_total_item: subtotalItem
    };

    if (tempIdItemEdicao) {
      setItensAdicionados((prev) => prev.map((i) => (i.temp_id === tempIdItemEdicao ? novoItem : i)));
      setTempIdItemEdicao(null);
    } else {
      setItensAdicionados((prev) => [...prev, novoItem]);
    }

    // Reset formulário do produto
    setProdutoSelecionado(null);
    setTermoBuscaProduto('');
    setQuantidade(1);
    setEmbalagem(1);
    setUnidade('UN');
    setModoDesconto('SEM_DESCONTO');
    setPercentualDesconto('');
    setPrecoFinalManual('');
  };

  // Editar Item da Lista
  const handleEditarItem = (item: any) => {
    setTempIdItemEdicao(item.temp_id);
    setProdutoSelecionado({
      id: item.produto_id,
      codprod: item.codprod,
      descricao: item.descricao,
      custoreal: item.preco_custo_unitario,
      pvenda: item.preco_venda_tabela
    });
    setTermoBuscaProduto(`${item.codprod} - ${item.descricao}`);
    setQuantidade(item.quantidade);
    setUnidade(item.unidade_medida || 'UN');
    setEmbalagem(item.embalagem || 1);
    
    if (item.percentual_desconto > 0) {
      setModoDesconto('PERCENTUAL');
      setPercentualDesconto(item.percentual_desconto);
      setPrecoFinalManual('');
    } else if (item.preco_final_unitario !== item.preco_venda_tabela) {
      setModoDesconto('MANUAL');
      setPrecoFinalManual(item.preco_final_unitario);
      setPercentualDesconto('');
    } else {
      setModoDesconto('SEM_DESCONTO');
      setPercentualDesconto('');
      setPrecoFinalManual('');
    }
  };

  const handleRemoverItem = (tempId: string) => {
    setItensAdicionados((prev) => prev.filter((i) => i.temp_id !== tempId));
  };

  const valorTotalOrcamento = itensAdicionados.reduce((acc, item) => acc + item.valor_total_item, 0);

  // Substitua o método handleSalvarOuPausar por este em src/pages/Orcamentos/index.tsx:
  const handleSalvarOuPausar = async (statusFinal: 'Pendente' | 'Concluido') => {
    if (!clienteNome.trim()) {
      alert('Informe ou selecione o cliente.');
      return;
    }
    if (itensAdicionados.length === 0) {
      alert('Adicione ao menos um item no orçamento.');
      return;
    }

    try {
      setSalvando(true);

      await orcamentosService.salvarOrcamento({
        codigo_customizado: codigoOrcamentoAtual,
        usuario_id: idUsuarioFinal,
        cliente_id: clienteSelecionado?.id || null,
        cliente_nome: clienteNome.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        endereco: endereco.trim(),
        bairro: bairro.trim(),
        numero: numero.trim(),
        contato_whatsapp: whatsapp.trim(),
        valor_total: valorTotalOrcamento,
        status: statusFinal,
        itens: itensAdicionados
      });

      alert(statusFinal === 'Pendente' ? 'Orçamento pausado e salvo em Pendentes!' : 'Orçamento concluído com sucesso!');
      setEmEdicao(false);
      resetaFormulario();
      carregarOrcamentos();
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      alert(`Erro ao processar orçamento: ${err?.message || 'Falha no banco de dados'}`);
    } finally {
      setSalvando(false);
    }
  };

  const resetaFormulario = () => {
    setCodigoOrcamentoAtual(null);
    setClienteSelecionado(null);
    setTermoBuscaCliente('');
    setClienteNome('');
    setCpfCnpj('');
    setCidade('Bom Jesus das Selvas');
    setEstado('Maranhão');
    setEndereco('');
    setBairro('');
    setNumero('');
    setPontoReferencia('');
    setPastaCliente('Geral');
    setContatoWhatsapp('');
    setItensAdicionados([]);
    setProdutoSelecionado(null);
    setTermoBuscaProduto('');
    setTempIdItemEdicao(null);
  };

  const handleAbrirParaEdicao = (orc: any) => {
    setCodigoOrcamentoAtual(orc.codigo_customizado);
    setClienteSelecionado(orc.clientes || null);
    setTermoBuscaCliente(orc.cliente_nome || '');
    setClienteNome(orc.cliente_nome || '');
    setCpfCnpj(orc.clientes?.cpf_cnpj || '');
    setCidade(orc.cidade || 'Bom Jesus das Selvas');
    setEstado(orc.estado || 'Maranhão');
    setEndereco(orc.endereco || '');
    setBairro(orc.bairro || '');
    setNumero(orc.numero || '');
    setPontoReferencia(orc.clientes?.ponto_referencia || '');
    setPastaCliente(orc.clientes?.pasta || 'Geral');
    setContatoWhatsapp(orc.contato_whatsapp || '');

    setItensAdicionados(
      (orc.orcamento_itens || []).map((item: any) => ({
        temp_id: item.id || Math.random().toString(),
        produto_id: item.produto_id,
        codprod: item.produtos?.codprod || 'N/A',
        descricao: item.produtos?.descricao || 'PRODUTO',
        unidade_medida: item.unidade_medida || 'UN',
        quantidade: item.quantidade,
        embalagem: item.embalagem || 1,
        preco_custo_unitario: item.preco_custo_unitario,
        preco_venda_tabela: item.preco_venda_tabela,
        percentual_desconto: item.percentual_desconto,
        preco_final_unitario: item.preco_final_unitario,
        valor_total_item: item.valor_total_item
      }))
    );

    setEmEdicao(true);
  };

  const pendentes = orcamentos.filter((o) => o.status === 'Pendente');
  const concluidos = orcamentos.filter((o) => o.status === 'Concluido');

  const listaExibida = abaAtiva === 'PENDENTES' ? pendentes : concluidos;

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-3xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">ORÇAMENTOS</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Gestão e Emissão de Propostas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetaFormulario();
              setEmEdicao(true);
            }}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Novo Orçamento
          </button>
        </div>

        {/* ABAS */}
        <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('PENDENTES')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'PENDENTES' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            PENDENTES ({pendentes.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('CONCLUIDOS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'CONCLUIDOS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            CONCLUÍDOS ({concluidos.length})
          </button>
        </div>

        {/* LISTAGEM */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando orçamentos...</div>
          ) : listaExibida.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhum orçamento encontrado nesta aba.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {listaExibida.map((orc) => (
                <div
                  key={orc.id}
                  onClick={() => {
                    if (abaAtiva === 'PENDENTES') handleAbrirParaEdicao(orc);
                    else setOrcamentoDetalhe(orc);
                  }}
                  className="p-3.5 bg-gray-50 hover:bg-emerald-50/40 border border-gray-200 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded-md uppercase">
                        {orc.codigo_customizado}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-gray-400">
                        {orc.data_registro} às {orc.hora_registro}
                      </span>
                    </div>
                    <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                      Cliente: {orc.cliente_nome}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">
                      Cidade: {orc.cidade}/{orc.estado} | Qtd Itens: {orc.orcamento_itens?.length || 0}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-xs text-[#09797a] bg-emerald-100 px-3 py-1.5 rounded-xl block mb-1">
                      {(orc.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <span className="text-[9px] font-black uppercase text-gray-400">
                      {abaAtiva === 'PENDENTES' ? 'Continuar' : 'Ver Detalhes'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* TELA / MODAL DE ORÇAMENTO */}
      {emEdicao && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">
                {codigoOrcamentoAtual ? `EDITAR ORÇAMENTO ${codigoOrcamentoAtual}` : 'NOVO ORÇAMENTO'}
              </h3>
              <button type="button" onClick={() => setEmEdicao(false)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="overflow-y-auto flex flex-col gap-4 pr-1 flex-1">
              
              {/* DADOS DO CLIENTE COM AUTOCOMPLETE */}
              <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex flex-col gap-2 relative">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Informações do Cliente</span>
                  <span className="text-[9px] font-mono font-bold text-[#09797a] bg-emerald-100 px-2 py-0.5 rounded uppercase">
                    Pasta: {pastaCliente}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Buscar Cliente Cadastrado *</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome, CPF/CNPJ ou WhatsApp..."
                    value={termoBuscaCliente}
                    onChange={(e) => {
                      setTermoBuscaCliente(e.target.value);
                      setClienteNome(e.target.value.toUpperCase());
                      setClienteSelecionado(null);
                    }}
                    className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                  />

                  {clientesEncontrados.length > 0 && !clienteSelecionado && (
                    <div className="absolute top-15 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-30 divide-y divide-gray-100">
                      {clientesEncontrados.map((cli) => (
                        <button
                          key={cli.id}
                          type="button"
                          onClick={() => handleSelecionarCliente(cli)}
                          className="w-full text-left p-3 hover:bg-emerald-50/50 flex justify-between items-center text-xs font-bold text-gray-800 uppercase"
                        >
                          <div>
                            <div>{cli.nome}</div>
                            <span className="text-[9px] text-gray-400 font-normal">{cli.contato_whatsapp} - {cli.cidade}/{cli.estado}</span>
                          </div>
                          <span className="text-[#09797a] font-mono text-[9px] bg-emerald-100 px-2 py-0.5 rounded">{cli.pasta}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">CPF / CNPJ</label>
                    <input
                      type="text"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Contato / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      placeholder="(99) 99999-9999"
                      value={whatsapp}
                      onChange={(e) => setContatoWhatsapp(e.target.value)}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Cidade</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Estado</label>
                    <input
                      type="text"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Endereço</label>
                    <input
                      type="text"
                      placeholder="Rua, Avenida..."
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Número</label>
                    <input
                      type="text"
                      placeholder="Nº"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Bairro</label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Ponto de Referência</label>
                    <input
                      type="text"
                      placeholder="Próximo a..."
                      value={pontoReferencia}
                      onChange={(e) => setPontoReferencia(e.target.value)}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* SELEÇÃO E INCLUSÃO DE PRODUTO */}
              <form onSubmit={handleAdicionarOuAtualizarItem} className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-2xl flex flex-col gap-3">
                <span className="text-[10px] font-black text-emerald-800 uppercase">
                  {tempIdItemEdicao ? 'Editar Item no Orçamento' : 'Adicionar Produto no Orçamento'}
                </span>

                <div className="flex flex-col gap-1 relative">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Buscar Produto</label>
                  <input
                    type="text"
                    value={termoBuscaProduto}
                    onChange={(e) => {
                      setTermoBuscaProduto(e.target.value);
                      setProdutoSelecionado(null);
                    }}
                    placeholder="Bipe o EAN ou digite o nome/código..."
                    className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                  />

                  {produtosEncontrados.length > 0 && !produtoSelecionado && (
                    <div className="absolute top-15 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-20 divide-y divide-gray-100">
                      {produtosEncontrados.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setProdutoSelecionado(p);
                            setTermoBuscaProduto(`${p.codprod} - ${p.descricao}`);
                            setProdutosEncontrados([]);
                          }}
                          className="w-full text-left p-3 hover:bg-emerald-50/50 flex justify-between items-center text-xs font-bold text-gray-800 uppercase"
                        >
                          <span>{p.codprod} - {p.descricao}</span>
                          <span className="text-emerald-700 font-mono">
                            {(p.pvenda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {produtoSelecionado && (
                  <div className="bg-white border border-emerald-300 p-3 rounded-xl flex justify-between items-center text-xs font-bold text-gray-800">
                    <div>
                      <span className="text-[9px] text-emerald-800 block uppercase">Cód: {produtoSelecionado.codprod}</span>
                      <span className="uppercase">{produtoSelecionado.descricao}</span>
                      <div className="flex gap-3 text-[10px] font-mono text-gray-500 mt-1">
                        <span>Custo: R$ {produtoSelecionado.custoreal || 0}</span>
                        <span>Preço Tabela: R$ {produtoSelecionado.pvenda || 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODOS DE DESCONTO */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Aplicação de Desconto</label>
                  <div className="flex gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setModoDesconto('SEM_DESCONTO');
                        setPercentualDesconto('');
                        setPrecoFinalManual('');
                      }}
                      className={`flex-1 py-1.5 rounded-lg border ${modoDesconto === 'SEM_DESCONTO' ? 'bg-[#09797a] text-white border-[#09797a]' : 'bg-white text-gray-600'}`}
                    >
                      Sem Desconto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModoDesconto('PERCENTUAL');
                        setPrecoFinalManual('');
                      }}
                      className={`flex-1 py-1.5 rounded-lg border ${modoDesconto === 'PERCENTUAL' ? 'bg-[#09797a] text-white border-[#09797a]' : 'bg-white text-gray-600'}`}
                    >
                      % Percentual
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModoDesconto('MANUAL');
                        setPercentualDesconto('');
                      }}
                      className={`flex-1 py-1.5 rounded-lg border ${modoDesconto === 'MANUAL' ? 'bg-[#09797a] text-white border-[#09797a]' : 'bg-white text-gray-600'}`}
                    >
                      Valor Manual
                    </button>
                  </div>
                </div>

                {modoDesconto === 'PERCENTUAL' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Desconto (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      placeholder="Digite o percentual..."
                      value={percentualDesconto}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPercentualDesconto(val === '' ? '' : Number(val));
                      }}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                )}

                {modoDesconto === 'MANUAL' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Preço Unitário Com Desconto (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Digite o valor..."
                      value={precoFinalManual}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrecoFinalManual(val === '' ? '' : Number(val));
                      }}
                      className="w-full h-9 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                )}

                {/* PRÉ-VISUALIZAÇÃO DO PREÇO E DESCONTO ANTES DE ADICIONAR */}
                {produtoSelecionado && (
                  <div className="bg-emerald-100/80 border border-emerald-300 p-2.5 rounded-xl flex justify-between items-center text-xs font-bold text-emerald-950">
                    <div>
                      <span className="text-[9px] uppercase block text-emerald-800">Preço Final Unitário:</span>
                      <span className="font-mono text-sm">
                        {precoFinalCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase block text-emerald-800">Desconto Aplicado:</span>
                      <span className="font-mono text-xs">
                        {percentualAplicadoCalculado.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* QUANTIDADE, UNIDADE E EMBALAGEM */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Quantidade</label>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      required
                      value={quantidade}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuantidade(val === '' ? '' : Number(val));
                      }}
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Unidade</label>
                    <select
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center uppercase"
                    >
                      {UNIDADES_OPCOES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Embalagem</label>
                    <input
                      type="number"
                      min={1}
                      disabled={unidade === 'UN'}
                      value={embalagem}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmbalagem(val === '' ? '' : Number(val));
                      }}
                      placeholder="Qtd por emb"
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center disabled:opacity-40"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!produtoSelecionado}
                  className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-2.5 rounded-2xl text-xs font-black uppercase shadow-md transition-all disabled:opacity-40 mt-1"
                >
                  {tempIdItemEdicao ? '✓ Atualizar Item' : '+ Adicionar Item no Orçamento'}
                </button>
              </form>

              {/* LISTA DE ITENS INCLUÍDOS */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase">Itens no Orçamento ({itensAdicionados.length})</span>
                {itensAdicionados.map((item) => (
                  <div key={item.temp_id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center text-xs font-bold">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-[#09797a] bg-[#09797a]/10 px-1.5 py-0.5 rounded">
                          Cód: {item.codprod}
                        </span>
                        <span className="uppercase text-gray-800">{item.descricao}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {item.quantidade} {item.unidade_medida} {item.unidade_medida !== 'UN' ? `(Emb c/ ${item.embalagem})` : ''} x {(item.preco_final_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        {item.percentual_desconto > 0 && (
                          <span className="text-emerald-700 ml-2 font-mono">(-{item.percentual_desconto}%)</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#09797a] mr-1">
                        {(item.valor_total_item || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEditarItem(item)}
                        className="p-1.5 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-black uppercase"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoverItem(item.temp_id)}
                        className="p-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-black uppercase"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* TOTAL E BOTÕES */}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-3">
              <div className="bg-emerald-100/70 border border-emerald-300 p-3 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-black text-emerald-900 uppercase">Total do Orçamento:</span>
                <span className="font-mono text-base font-black text-emerald-950">
                  {valorTotalOrcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmEdicao(false)}
                  className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => handleSalvarOuPausar('Pendente')}
                  className="flex-1 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-2xl text-xs font-black uppercase"
                >
                  Pausar
                </button>

                <button
                  type="button"
                  disabled={salvando || itensAdicionados.length === 0}
                  onClick={() => handleSalvarOuPausar('Concluido')}
                  className="flex-2 py-3 bg-[#09797a] text-white hover:bg-[#075f60] rounded-2xl text-xs font-black uppercase shadow-md disabled:opacity-40"
                >
                  Salvar Orçamento
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE RESUMO DA ABA CONCLUÍDOS */}
      {orcamentoDetalhe && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase">Detalhes do Orçamento</span>
                <h3 className="text-[#09797a] font-black text-base uppercase">{orcamentoDetalhe.codigo_customizado}</h3>
              </div>
              <button type="button" onClick={() => setOrcamentoDetalhe(null)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl grid grid-cols-2 gap-2 text-xs font-bold">
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Cliente</span>
                <span className="text-gray-800">{orcamentoDetalhe.cliente_nome}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Cidade/Estado</span>
                <span className="text-gray-800">{orcamentoDetalhe.cidade}/{orcamentoDetalhe.estado}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Data/Hora</span>
                <span className="text-gray-800">{orcamentoDetalhe.data_registro} às {orcamentoDetalhe.hora_registro}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Atendente</span>
                <span className="text-gray-800">{orcamentoDetalhe.usuarios?.nome || 'SISTEMA'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 max-h-[40vh]">
              <span className="text-[10px] font-black text-gray-400 uppercase px-1">Itens ({orcamentoDetalhe.orcamento_itens?.length || 0})</span>
              {orcamentoDetalhe.orcamento_itens?.map((item: any) => {
                const prod = item.produtos || {};
                return (
                  <div key={item.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center text-xs font-bold">
                    <div>
                      <h4 className="text-gray-800 uppercase">{prod.descricao || 'PRODUTO'}</h4>
                      <p className="text-[10px] text-gray-400">
                        {item.quantidade} {item.unidade_medida || 'UN'} {item.embalagem > 1 ? `(Emb c/ ${item.embalagem})` : ''} x {(item.preco_final_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <span className="font-mono text-[#09797a]">
                      {(item.valor_total_item || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-emerald-100/70 border border-emerald-300 p-3 rounded-2xl flex justify-between items-center font-black">
              <span className="text-xs text-emerald-900 uppercase">Valor Total:</span>
              <span className="font-mono text-base text-emerald-950">
                {(orcamentoDetalhe.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOrcamentoDetalhe(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => gerarPdfOrcamento(orcamentoDetalhe, orcamentoDetalhe.orcamento_itens || [])}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all"
              >
                🖨️ Exportar Orçamento PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}