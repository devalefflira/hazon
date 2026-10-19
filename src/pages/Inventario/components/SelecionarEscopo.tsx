// Arquivo: src/pages/Inventario/components/SelecionarEscopo.tsx
import { useState, useEffect, useMemo } from 'react';
import { Layers } from 'lucide-react';
import { inventarioService } from '../services/inventarioService';
import type { EscopoInventario, HierarquiaProduto } from '../services/inventarioService';
import { extrairCategorias, extrairDepartamentos, extrairSecoes } from '../utils/escopoInventario';

interface SelecionarEscopoProps {
  onConfirmar: (escopo: EscopoInventario) => void;
}

export default function SelecionarEscopo({ onConfirmar }: SelecionarEscopoProps) {
  const [hierarquia, setHierarquia] = useState<HierarquiaProduto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  const [departamento, setDepartamento] = useState('');
  const [secao, setSecao] = useState('');
  const [categoria, setCategoria] = useState('');

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const dados = await inventarioService.listarHierarquiaProdutos();
        if (ativo) setHierarquia(dados);
      } catch (err) {
        console.error('Erro ao carregar hierarquia de produtos:', err);
        if (ativo) setErroCarga('Não foi possível carregar os departamentos do cadastro.');
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const departamentos = useMemo(() => extrairDepartamentos(hierarquia), [hierarquia]);

  const secoes = useMemo(
    () => (departamento ? extrairSecoes(hierarquia, departamento) : []),
    [hierarquia, departamento]
  );

  const categorias = useMemo(
    () => (departamento && secao ? extrairCategorias(hierarquia, departamento, secao) : []),
    [hierarquia, departamento, secao]
  );

  const handleDepartamento = (valor: string) => {
    setDepartamento(valor);
    setSecao('');
    setCategoria('');
  };

  const handleSecao = (valor: string) => {
    setSecao(valor);
    setCategoria('');
  };

  const handleConfirmar = () => {
    if (!departamento || !secao) return;
    onConfirmar({
      departamento,
      secao,
      categoria: categoria || null
    });
  };

  const formularioValido = Boolean(departamento && secao);

  return (
    <div className="flex flex-col flex-1 justify-center items-center text-center px-1 animate-fadeIn">
      <div className="w-14 h-14 bg-[#09797a]/10 rounded-full flex justify-center items-center mb-3">
        <Layers className="w-7 h-7 text-[#09797a]" strokeWidth={1.5} />
      </div>

      <h2 className="text-gray-700 font-extrabold text-base mb-1">Qual o escopo da coleta?</h2>
      <p className="text-xs text-gray-400 font-medium mb-5 max-w-65">
        Departamento e Seção são obrigatórios. Somente produtos deste escopo poderão ser contados.
      </p>

      {carregando ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#09797a]"></div>
          <span className="text-[11px] text-gray-400 italic">Carregando cadastro...</span>
        </div>
      ) : erroCarga ? (
        <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-xl font-bold">{erroCarga}</div>
      ) : (
        <div className="w-full flex flex-col gap-3 text-left">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Departamento *</label>
            <select
              value={departamento}
              onChange={(e) => handleDepartamento(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-xs font-semibold outline-none focus:border-[#09797a]"
            >
              <option value="">Selecione um departamento...</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Seção *</label>
            <select
              value={secao}
              disabled={!departamento}
              onChange={(e) => handleSecao(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-xs font-semibold outline-none focus:border-[#09797a] disabled:opacity-50"
            >
              <option value="">{departamento ? 'Selecione uma seção...' : 'Escolha o departamento primeiro'}</option>
              {secoes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Categoria (opcional)</label>
            <select
              value={categoria}
              disabled={!secao}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-xs font-semibold outline-none focus:border-[#09797a] disabled:opacity-50"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!formularioValido}
            className="w-full h-11 mt-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            Confirmar Escopo
          </button>
        </div>
      )}
    </div>
  );
}
