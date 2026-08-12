// Arquivo: src/pages/Produtos/components/ImportarProdutosModal.tsx
import { useState, useRef } from 'react';
import { produtosService } from '../services/produtosService';
import type { CriarProdutoPayload } from '../types/produtos.types';

interface ImportarProdutosModalProps {
  onSucesso: () => void;
  onFechar: () => void;
}

export function ImportarProdutosModal({ onSucesso, onFechar }: ImportarProdutosModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [textoConteudo, setTextoEntrada] = useState('');
  const [processando, setProcessando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lê o arquivo CSV selecionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const conteudo = event.target?.result as string;
        setTextoEntrada(conteudo || '');
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleImportar = async () => {
    if (!textoConteudo.trim()) return;

    try {
      setProcessando(true);

      const linhas = textoConteudo.trim().split(/\r?\n/);
      const produtosParaImportar: CriarProdutoPayload[] = [];

      linhas.forEach((linha, index) => {
        // Ignora linha vazia
        if (!linha.trim()) return;

        // Ignora o cabeçalho se contiver CODPROD
        if (index === 0 && linha.toUpperCase().includes('CODPROD')) return;

        // Suporta Vírgula (CSV clássico), Ponto e Vírgula (CSV Excel BR) ou Tabulação
        const colunas = linha.includes('\t')
          ? linha.split('\t')
          : linha.includes(';')
          ? linha.split(';')
          : linha.split(',');

        if (colunas.length >= 2) {
          produtosParaImportar.push({
            codprod: colunas[0]?.trim().replace(/^"|"$/g, ''),
            descricao: colunas[1]?.trim().replace(/^"|"$/g, '') || '',
            codbarra: colunas[2]?.trim().replace(/^"|"$/g, '') || '',
            unidade: colunas[3]?.trim().replace(/^"|"$/g, '') || 'UN',
            custoreal: Number(colunas[4]?.trim().replace(/^"|"$/g, '').replace(',', '.')) || 0,
            pvenda: Number(colunas[5]?.trim().replace(/^"|"$/g, '').replace(',', '.')) || 0,
            departamento: colunas[6]?.trim().replace(/^"|"$/g, '') || '',
            secao: colunas[7]?.trim().replace(/^"|"$/g, '') || '',
            categoria: colunas[8]?.trim().replace(/^"|"$/g, '') || ''
          });
        }
      });

      if (produtosParaImportar.length === 0) {
        alert('Nenhum registro válido foi identificado no arquivo CSV.');
        return;
      }

      await produtosService.importarMassaProdutos(produtosParaImportar);

      alert(`🚀 ${produtosParaImportar.length} produtos importados/atualizados com sucesso!`);
      onSucesso();
      onFechar();
    } catch (err) {
      console.error(err);
      alert('Erro ao processar o arquivo CSV. Verifique a codificação do arquivo.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-[#09797a] font-black text-base uppercase">Importar Produtos via Arquivo CSV</h3>
            <p className="text-[10px] text-gray-400 font-bold">Selecione o arquivo `.csv` no computador</p>
          </div>
          <button type="button" onClick={onFechar} className="text-gray-400 font-bold hover:text-black">✕</button>
        </div>

        {/* ESTRUTURA REQUISITADA */}
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl text-[10px] text-gray-600 font-mono">
          <p className="font-bold text-gray-700 uppercase mb-1">Colunas do Arquivo CSV (Separadas por vírgula ou ;):</p>
          <code className="text-[#09797a] font-black block">CODPROD, DESCRICAO, CODBARRA, UNIDADE, CUSTOREAL, PVENDA, DEPARTAMENTO, SECAO, CATEGORIA</code>
        </div>

        {/* INPUT DE ARQUIVO DISCRETO */}
        <input
          type="file"
          accept=".csv,.txt"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* ÁREA DE SELEÇÃO E DRAG & DROP */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#09797a]/40 hover:border-[#09797a] bg-gray-50/50 hover:bg-emerald-50/30 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
        >
          <span className="text-3xl mb-2">📁</span>
          {arquivo ? (
            <div className="text-center">
              <p className="text-xs font-black text-[#09797a] uppercase">{arquivo.name}</p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{(arquivo.size / 1024).toFixed(1)} KB — Clique para trocar</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs font-bold text-gray-700">Clique para buscar o arquivo <span className="text-[#09797a] font-black">.CSV</span> no computador</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Suporta codificação UTF-8 ou separado por vírgula/ponto-e-vírgula</p>
            </div>
          )}
        </div>

        {/* PRÉ-VISUALIZAÇÃO COMPACTA */}
        {textoConteudo && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Pré-visualização do Conteúdo:</span>
            <textarea
              rows={4}
              readOnly
              value={textoConteudo}
              className="w-full p-3 text-[10px] font-mono border border-gray-200 rounded-2xl bg-gray-50 text-gray-600 focus:outline-none resize-none"
            />
          </div>
        )}

        {/* AÇÕES */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onFechar}
            className="px-5 py-3 rounded-2xl text-xs font-bold bg-gray-100 text-gray-500 active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={processando || !textoConteudo.trim()}
            onClick={handleImportar}
            className="px-6 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            {processando ? 'Enviando Lote...' : '🚀 Processar e Salvar no Banco'}
          </button>
        </div>

      </div>
    </div>
  );
}