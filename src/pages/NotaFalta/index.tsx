// Arquivo: src/pages/NotaFalta/index.tsx
import { useState, useEffect } from 'react';
import { notaFaltaService } from './services/notaFaltaService';

interface NotaFaltaProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
}

export default function NotaFalta({ onVoltarParaHome, usuarioLogado }: NotaFaltaProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [listaRupturas, setListaRupturas] = useState<any[]>([]);
  const [statusFiltro, setStatusFiltro] = useState('TODOS');

  // Modal de Cadastro
  const [modalAberta, setModalAberta] = useState(false);
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [motivos, setMotivos] = useState<any[]>([]);
  const [motivoId, setMotivoId] = useState('');

  // 🆕 ESTADOS PARA ESTOQUE BAIXO
  const [quantidadeRestante, setQuantidadeRestante] = useState<number>(1);
  const [unidadeRestante, setUnidadeRestante] = useState('UN');

  const carregarRupturas = async () => {
    try {
      setLoading(true);
      setErro(null);
      const dados = await notaFaltaService.listarNotasFalta(statusFiltro);
      setListaRupturas(dados);
    } catch (err: any) {
      console.error(err);
      setErro('Falha ao conectar com o motor de rupturas do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const carregarMotivos = async () => {
    try {
      const dados = await notaFaltaService.listarMotivosFalta();
      setMotivos(dados);
      if (dados.length > 0) setMotivoId(dados[0].id);
    } catch (err) {
      console.error('Erro ao carregar motivos:', err);
    }
  };

  useEffect(() => {
    carregarRupturas();
    carregarMotivos();
  }, [statusFiltro]);

  useEffect(() => {
    if (!termoBuscaProduto.trim()) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await notaFaltaService.buscarProdutoPorTermo(termoBuscaProduto);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [termoBuscaProduto]);

  // Identifica se o motivo selecionado é Estoque Baixo
  const motivoSelecionadoObj = motivos.find(m => m.id === motivoId);
  const isEstoqueBaixo = motivoSelecionadoObj?.descricao?.toUpperCase().includes('BAIXO');

  const handleSalvarRuptura = async () => {
    if (!produtoSelecionado) {
      alert('Selecione um produto.');
      return;
    }
    if (!motivoId) {
      alert('Selecione o motivo da ruptura.');
      return;
    }

    try {
      setLoading(true);
      const usuarioIdFinal = usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id || '00000000-0000-0000-0000-000000000000';

      await notaFaltaService.cadastrarNotaFalta({
        usuario_id: usuarioIdFinal,
        produto_id: produtoSelecionado.id,
        motivo_falta_id: motivoId,
        quantidade_restante: isEstoqueBaixo ? quantidadeRestante : 0,
        unidade_restante: isEstoqueBaixo ? unidadeRestante : 'UN'
      });

      alert('Ruptura registrada com sucesso!');
      setModalAberta(false);
      setProdutoSelecionado(null);
      setTermoBuscaProduto('');
      setQuantidadeRestante(1);
      carregarRupturas();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar ruptura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Nota de Falta</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Registro de Rupturas de Estoque</p>
            </div>
          </div>
        </div>

        {/* ALERTA DE ERRO */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl text-center">
            {erro}
          </div>
        )}

        {/* BOTÃO NOVO REGISTRO */}
        <button
          type="button"
          onClick={() => setModalAberta(true)}
          className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-3.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex justify-center items-center gap-2"
        >
          📝 Registrar Nova Falta
        </button>

        {/* FILTROS DE PESQUISA */}
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">Filtros de Pesquisa</span>
          <div className="flex gap-2">
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="flex-1 h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-700"
            >
              <option value="TODOS">Todos os Status de Cotação</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Cotação">Em Cotação</option>
              <option value="Cotado">Cotado</option>
            </select>
            <button
              type="button"
              onClick={carregarRupturas}
              className="bg-[#09797a] text-white px-4 rounded-xl text-xs font-black uppercase"
            >
              🔍 Filtrar
            </button>
          </div>
        </div>

        {/* LISTAGEM DE PRODUTOS EM FALTA */}
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">Produtos em Falta ({listaRupturas.length})</span>
          
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Consultando rupturas...</div>
          ) : listaRupturas.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhuma ruptura pendente de cotação.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {listaRupturas.map((item) => {
                const prod = item.produtos || {};
                return (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold bg-[#09797a]/10 text-[#09797a] px-2 py-0.5 rounded-lg">{item.codigo_customizado}</span>
                        <span className="text-[10px] font-mono text-gray-400">Cód: {prod.codprod || 'N/A'}</span>
                      </div>
                      <h4 className="font-black text-xs text-gray-800 uppercase mt-1">{prod.descricao || 'PRODUTO REMOVIDO'}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">
                        EAN: {prod.codbarra || 'SEM EAN'} | Dep: {prod.departamento || 'GERAL'} {prod.secao ? `› ${prod.secao}` : ''}
                      </p>
                      
                      {/* MOTIVO E SALDO RESTANTE */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-600 font-bold">Motivo: {item.motivos_falta?.descricao || 'Não informado'}</span>
                        {Number(item.quantidade_restante) > 0 && (
                          <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-md font-mono">
                            Saldo Restante: {item.quantidade_restante} {item.unidade_restante}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block text-[9px] font-black px-2 py-1 rounded-xl uppercase ${
                        item.status_cotacao === 'Pendente' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.status_cotacao}
                      </span>
                      <span className="block text-[9px] font-mono text-gray-400 mt-1">
                        {new Date(item.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL REGISTRO DE NOVA FALTA */}
      {modalAberta && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-[#09797a] font-black text-base uppercase">Registrar Ruptura de Estoque</h3>
              <button type="button" onClick={() => setModalAberta(false)} className="text-gray-400 font-bold">✕</button>
            </div>

            {/* BUSCA DE PRODUTO */}
            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] font-black text-gray-400 uppercase px-1">Buscar Produto (CODPROD, EAN ou Nome)</label>
              <input
                type="text"
                value={termoBuscaProduto}
                onChange={(e) => {
                  setTermoBuscaProduto(e.target.value);
                  setProdutoSelecionado(null);
                }}
                placeholder="Bipe o EAN ou digite o termo..."
                className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
              />

              {/* DROPDOWN DE RESULTADOS */}
              {produtosEncontrados.length > 0 && !produtoSelecionado && (
                <div className="absolute top-16 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-10 divide-y divide-gray-100">
                  {produtosEncontrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProdutoSelecionado(p);
                        setTermoBuscaProduto(`${p.codprod} - ${p.descricao}`);
                        setUnidadeRestante(p.unidade || 'UN');
                        setProdutosEncontrados([]);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-50 flex flex-col text-xs font-bold text-gray-700 uppercase"
                    >
                      <span>{p.codprod} - {p.descricao}</span>
                      <span className="text-[9px] font-mono text-gray-400 normal-case">EAN: {p.codbarra || 'N/A'} | Dep: {p.departamento || 'GERAL'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PRODUTO SELECIONADO */}
            {produtoSelecionado && (
              <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-2xl flex flex-col gap-1">
                <span className="text-[9px] font-black text-emerald-800 uppercase">Produto Selecionado</span>
                <p className="text-xs font-black text-gray-800 uppercase">{produtoSelecionado.descricao}</p>
                <p className="text-[10px] text-gray-500 font-mono">
                  EAN: {produtoSelecionado.codbarra || 'N/A'} | Cód: {produtoSelecionado.codprod} | Unid: {produtoSelecionado.unidade || 'UN'}
                </p>
              </div>
            )}

            {/* SELEÇÃO DO MOTIVO */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase px-1">Motivo da Ruptura</label>
              <select
                value={motivoId}
                onChange={(e) => setMotivoId(e.target.value)}
                className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-2xl font-bold text-gray-700"
              >
                {motivos.map((m) => (
                  <option key={m.id} value={m.id}>{m.descricao.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* 🆕 CAMPOS CONDICIONAIS DE ESTOQUE BAIXO */}
            {isEstoqueBaixo && (
              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl flex flex-col gap-2 animate-scale-up">
                <span className="text-[10px] font-black text-amber-900 uppercase">Informa de Saldo em Loja (Para o Comprador)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase px-1">Qtd Ainda Restante</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={quantidadeRestante}
                      onChange={(e) => setQuantidadeRestante(Number(e.target.value))}
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase px-1">Tipo de Unidade</label>
                    <select
                      value={unidadeRestante}
                      onChange={(e) => setUnidadeRestante(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-800"
                    >
                      <option value="UN">UN - Unidade</option>
                      <option value="CX">CX - Caixa</option>
                      <option value="FD">FD - Fardo</option>
                      <option value="SC">SC - Saco</option>
                      <option value="KG">KG - Quilo</option>
                      <option value="PCT">PCT - Pacote</option>
                      <option value="LT">LT - Lata/Litro</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* AÇÕES */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                className="px-5 py-3 rounded-2xl text-xs font-bold bg-gray-100 text-gray-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading || !produtoSelecionado}
                onClick={handleSalvarRuptura}
                className="px-6 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                {loading ? 'Registrando...' : 'Confirmar & Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}