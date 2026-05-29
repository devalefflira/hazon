import { useState, useEffect } from 'react';
import { fornecedoresService } from '../services/fornecedoresService';

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
}

interface Vendedor {
  id: string;
  nome: string;
  telefone: string;
  email: string;
}

interface DetalhesProps {
  fornecedor: Fornecedor;
  onFechar: () => void;
}

// Auxiliar para formatar CNPJ na exibição estática
const formatarCnpjExibicao = (raw: string) => {
  const num = raw.replace(/\D/g, '');
  return num.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

export default function DetalhesFornecedor({ fornecedor, onFechar }: DetalhesProps) {
  const [aba, setAba] = useState<'dados' | 'vendedores'>('dados');
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (aba === 'vendedores') {
      async function carregarVendedores() {
        try {
          setLoading(true);
          const dados = await fornecedoresService.buscarVendedoresAtrelados(fornecedor.id);
          setVendedores(dados as Vendedor[] || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
      carregarVendedores();
    }
  }, [aba, fornecedor.id]);

  return (
    <div className="w-full flex flex-col animate-fadeIn flex-1">
      
      {/* ABAS DO DETALHE */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-4 w-full select-none">
        <button
          onClick={() => setAba('dados')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${aba === 'dados' ? 'bg-[#09797a] text-white shadow-sm' : 'text-gray-500'}`}
        >
          Dados Gerais
        </button>
        <button
          onClick={() => setAba('vendedores')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${aba === 'vendedores' ? 'bg-[#09797a] text-white shadow-sm' : 'text-gray-500'}`}
        >
          Vendedores Atrelados
        </button>
      </div>

      {/* CONTEÚDO DA ABA DADOS */}
      {aba === 'dados' && (
        <div className="w-full flex flex-col gap-3.5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wide">Nome Fantasia</span>
            <span className="text-sm font-bold text-gray-800 uppercase">{fornecedor.nome_fantasia}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wide">Razão Social</span>
            <span className="text-xs font-semibold text-gray-600">{fornecedor.razao_social}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wide">CNPJ Fiscal</span>
            <span className="text-xs font-mono font-bold text-gray-700 tracking-wider">{formatarCnpjExibicao(fornecedor.cnpj)}</span>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA VENDEDORES */}
      {aba === 'vendedores' && (
        <div className="w-full flex flex-col flex-1 overflow-y-auto max-h-75">
          {loading ? (
            <div className="flex justify-center items-center py-8 w-full">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#09797a]"></div>
            </div>
          ) : vendedores.length === 0 ? (
            <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <span className="text-2xl mb-1 block">💼</span>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Nenhum vendedor atrelado a este fornecedor até o momento.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {vendedores.map(v => (
                <div key={v.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col gap-0.5 shadow-sm">
                  <span className="font-bold text-sm text-gray-800">{v.nome}</span>
                  <span className="text-xs text-gray-500 font-medium">📞 {v.telefone}</span>
                  <span className="text-xs text-gray-500 font-medium truncate">✉️ {v.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BOTÃO VOLTAR */}
      <button
        onClick={onFechar}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs h-11 transition-all mt-auto pt-0.5"
      >
        Voltar para Lista
      </button>
    </div>
  );
}