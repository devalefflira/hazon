import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BarcodeScannerModal } from '../pages/RupturaGondola/components/BarcodeScannerModal';

export interface ProdutoBusca {
  id: string;
  codprod: string;
  descricao: string;
  codbarra?: string | null;
  unidade?: string | null;
  custoreal?: number | null;
  pvenda?: number | null;
  departamento?: string | null;
  secao?: string | null;
  categoria?: string | null;
}

interface Props {
  produtoSelecionadoId?: string;
  onSelecionarProduto: (produto: ProdutoBusca) => void;
  tituloCard?: string;
  placeholder?: string;
}

export const SeletorProdutoScanner: React.FC<Props> = ({
  produtoSelecionadoId,
  onSelecionarProduto,
  tituloCard = 'LOCALIZAR PRODUTO (BIPAGEM / BUSCA)',
  placeholder = 'Digite código de barras, codprod ou descrição...'
}) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<ProdutoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoBusca | null>(null);
  const [scannerAberto, setScannerAberto] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Carregar dados se já vier um ID selecionado previamente
  useEffect(() => {
    if (produtoSelecionadoId && (!produtoAtual || produtoAtual.id !== produtoSelecionadoId)) {
      supabase
        .from('produtos')
        .select('*')
        .eq('id', produtoSelecionadoId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setProdutoAtual(data);
            setTermoBusca(`${data.codprod} - ${data.descricao}`);
          }
        });
    } else if (!produtoSelecionadoId) {
      setProdutoAtual(null);
      setTermoBusca('');
    }
  }, [produtoSelecionadoId]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Busca instantânea por descrição parcial, código interno ou código de barras
  useEffect(() => {
    const termo = termoBusca.trim();
    if (!termo || (produtoAtual && termo === `${produtoAtual.codprod} - ${produtoAtual.descricao}`)) {
      setSugestoes([]);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await supabase
          .from('produtos')
          .select('*')
          .or(`descricao.ilike.%${termo}%,codprod.ilike.%${termo}%,codbarra.ilike.%${termo}%`)
          .limit(10);

        setSugestoes(data || []);
        setDropdownAberto(true);
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBusca]);

  const handleEscolher = (p: ProdutoBusca) => {
    setProdutoAtual(p);
    setTermoBusca(`${p.codprod} - ${p.descricao}`);
    setDropdownAberto(false);
    onSelecionarProduto(p);
  };

  const handleLimpar = () => {
    setProdutoAtual(null);
    setTermoBusca('');
    setSugestoes([]);
    setDropdownAberto(false);
  };

  // Quando a câmera bipar um código de barras com sucesso
  const handleBarcodeDetectado = async (barcode: string) => {
    setScannerAberto(false);
    const code = barcode.trim();
    if (!code) return;

    try {
      // 1. Tenta correspondência exata com codbarra ou codprod
      const { data: exato } = await supabase
        .from('produtos')
        .select('*')
        .or(`codbarra.eq.${code},codprod.eq.${code}`)
        .maybeSingle();

      if (exato) {
        handleEscolher(exato);
        return;
      }

      // 2. Se não encontrar exato, pesquisa parcial e abre lista
      setTermoBusca(code);
      const { data: parciais } = await supabase
        .from('produtos')
        .select('*')
        .or(`codbarra.ilike.%${code}%,codprod.ilike.%${code}%`)
        .limit(10);

      if (parciais && parciais.length > 0) {
        setSugestoes(parciais);
        setDropdownAberto(true);
      } else {
        alert(`Produto com código de barras "${code}" não foi localizado no cadastro.`);
      }
    } catch (err) {
      console.error('Erro na leitura de código de barras:', err);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs" ref={containerRef}>
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-2">
        {tituloCard} <span className="text-[10px] font-bold text-teal-700 lowercase">leitura rápida</span>
      </span>

      <div className="flex items-center gap-2 relative">
        <div className="relative flex-1">
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            onFocus={() => {
              if (sugestoes.length > 0) setDropdownAberto(true);
            }}
            placeholder={placeholder}
            className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#09797a]/30 focus:border-[#09797a] transition-all"
          />

          {termoBusca && (
            <button
              type="button"
              onClick={handleLimpar}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Botão de Câmera / Bipagem */}
        <button
          type="button"
          onClick={() => setScannerAberto(true)}
          className="w-11 h-11 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 flex-shrink-0"
          title="Abrir Câmera para Leitura de Código de Barras"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Dropdown de Resultados da Pesquisa */}
        {dropdownAberto && sugestoes.length > 0 && (
          <div className="absolute left-0 right-13 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
            {sugestoes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleEscolher(p)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50/50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {p.descricao}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                    <span>Cód: <strong>{p.codprod}</strong></span>
                    {p.codbarra && <span>EAN: {p.codbarra}</span>}
                  </div>
                </div>
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {dropdownAberto && buscando && (
          <div className="absolute left-0 right-13 top-full mt-1.5 bg-white border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-400 shadow-lg z-50">
            Buscando produto...
          </div>
        )}
      </div>

      {/* Modal BarcodeScanner com os nomes de props corretos */}
      {scannerAberto && (
        <BarcodeScannerModal
          onScanSuccess={handleBarcodeDetectado}
          onFechar={() => setScannerAberto(false)}
        />
      )}
    </div>
  );
};