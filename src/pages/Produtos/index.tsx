// Arquivo: src/pages/Produtos/index.tsx
import { useState, useEffect } from 'react';
import { produtosService } from './services/produtosService';
import { ImportarProdutosModal } from './components/ImportarProdutosModal';
import type { ProdutoDTO } from './types/produtos.types';

interface ProdutosProps {
  onVoltarParaHome: () => void;
}

export default function Produtos({ onVoltarParaHome }: ProdutosProps) {
  const [produtos, setProdutos] = useState<ProdutoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [modalImportarAberto, setModalImportarAberto] = useState(false);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const response = await produtosService.listarProdutos(0, 100, { termo: termoBusca });
      setProdutos(response.data);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar listagem de produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, [termoBusca]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER DA PÁGINA */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onVoltarParaHome} 
              className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Cadastro de Produtos</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Gestão do Catálogo de Mercadorias e Preços</p>
            </div>
          </div>

          {/* BARRAS DE AÇÃO E BOTÃO DE IMPORTAÇÃO */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalImportarAberto(true)}
              className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              📥 Importar em Massa
            </button>
          </div>
        </div>

        {/* CAMPO DE PESQUISA RÁPIDA */}
        <div className="w-full">
          <input
            type="text"
            placeholder="Pesquisar por Descrição, Código Interno (CODPROD) ou Código de Barras..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
          />
        </div>

        {/* TABELA DE PRODUTOS ATUALIZADA COM AS NOVAS COLUNAS */}
        <div className="flex-1 overflow-x-auto border border-gray-200 rounded-3xl bg-gray-50/50">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-black uppercase bg-gray-100/80">
                <th className="py-3 px-3">Cód. Prod</th>
                <th className="py-3 px-3">Descrição / EAN</th>
                <th className="py-3 px-3">Unid</th>
                <th className="py-3 px-3">Dep. / Secão / Categoria</th>
                <th className="py-3 px-3 text-right">Custo Real</th>
                <th className="py-3 px-3 text-right">P. Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium text-gray-600 uppercase">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 font-bold uppercase tracking-wider">
                    Carregando Catálogo de Produtos...
                  </td>
                </tr>
              ) : produtos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 font-bold uppercase tracking-wider">
                    Nenhum produto cadastrado ou encontrado.
                  </td>
                </tr>
              ) : (
                produtos.map((p) => (
                  <tr key={p.id} className="hover:bg-white transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#09797a]">{p.codprod}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-black text-gray-800 block">{p.descricao}</span>
                      <span className="text-[9px] font-mono text-gray-400 font-normal">
                        EAN: {p.codbarra || p.codigo_barras || 'SEM EAN'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold">{p.unidade || 'UN'}</td>
                    <td className="py-2.5 px-3 text-[10px] text-gray-500">
                      {p.departamento || 'GERAL'} 
                      {p.secao ? ` › ${p.secao}` : ''}
                      {p.categoria ? ` › ${p.categoria}` : ''}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-700">
                      R$ {Number(p.custoreal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                      R$ {Number(p.pvenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL FLUTUANTE DE IMPORTAÇÃO EM MASSA */}
      {modalImportarAberto && (
        <ImportarProdutosModal
          onSucesso={carregarProdutos}
          onFechar={() => setModalImportarAberto(false)}
        />
      )}
    </div>
  );
}