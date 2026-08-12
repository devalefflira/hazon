import { useState, useEffect } from 'react';
import { vendedoresService } from '../services/vendedoresService';
import { fornecedoresService, type FornecedorDTO } from '../../Fornecedores/services/fornecedoresService';

interface CadastroVendedorProps {
  onSucesso: () => void;
  onCancelar: () => void;
}

export function CadastroVendedor({ onSucesso, onCancelar }: CadastroVendedorProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  
  // ESTADOS DOS SELETORES DE SETOR E SUBSETOR
  const [setores, setSetores] = useState<any[]>([]);
  const [subsetores, setSubsetores] = useState<any[]>([]);
  const [setorId, setSetorId] = useState('');
  const [subsetorId, setSubsetorId] = useState('');

  // ESTADOS DO AUTOCOMPLETE DE FORNECEDOR
  const [termoBuscaFornecedor, setTermoBuscaFornecedor] = useState('');
  const [fornecedoresFiltrados, setFornecedoresFiltrados] = useState<FornecedorDTO[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorDTO | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [salvando, setSalvando] = useState(false);

  // Carrega setores ao abrir a modal
  useEffect(() => {
    const carregarSetores = async () => {
      try {
        const dados = await vendedoresService.listarSetores();
        setSetores(dados || []);
        if (dados && dados.length > 0) {
          setSetorId(dados[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar setores:', err);
      }
    };
    carregarSetores();
  }, []);

  // Carrega subsetores sempre que o setor mudar
  useEffect(() => {
    if (!setorId) {
      setSubsetores([]);
      setSubsetorId('');
      return;
    }

    const carregarSubsetores = async () => {
      try {
        const dados = await vendedoresService.listarSubsetores(setorId);
        setSubsetores(dados || []);
        if (dados && dados.length > 0) {
          setSubsetorId(dados[0].id);
        } else {
          setSubsetorId('');
        }
      } catch (err) {
        console.error('Erro ao carregar subsetores:', err);
      }
    };
    carregarSubsetores();
  }, [setorId]);

  // Autocomplete dinâmico do fornecedor
  useEffect(() => {
    if (!termoBuscaFornecedor.trim() || fornecedorSelecionado) {
      setFornecedoresFiltrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setBuscando(true);
        const todosFornecedores = await fornecedoresService.listarFornecedores();
        const termoLower = termoBuscaFornecedor.toLowerCase();

        const filtrados = todosFornecedores.filter(f => 
          f.razao_social.toLowerCase().includes(termoLower) ||
          f.nome_fantasia.toLowerCase().includes(termoLower) ||
          f.cnpj.includes(termoLower)
        ).slice(0, 10);

        setFornecedoresFiltrados(filtrados);
      } catch (err) {
        console.error('Erro ao buscar fornecedores:', err);
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBuscaFornecedor, fornecedorSelecionado]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fornecedorSelecionado?.id) {
      alert('Selecione uma Empresa / Fornecedor da lista.');
      return;
    }

    if (!nome.trim() || !telefone.trim()) {
      alert('Preencha o Nome do Vendedor e o Contato.');
      return;
    }

    try {
      setSalvando(true);

      await vendedoresService.salvarVendedor({
        nome: nome.trim().toUpperCase(),
        telefone: telefone.trim(),
        fornecedorId: fornecedorSelecionado.id,
        setorId: setorId,
        subsetorId: subsetorId
      });

      alert('Representante cadastrado com sucesso!');
      onSucesso();
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar representante comercial.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-4xl p-6 shadow-2xl flex flex-col gap-4">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
          <button type="button" onClick={onCancelar} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl">←</button>
          <div>
            <h1 className="text-[#09797a] font-black text-lg leading-tight uppercase">Novo Representante</h1>
            <p className="text-[10px] text-gray-400 font-bold tracking-wide">Ficha do Representante Comercial</p>
          </div>
        </div>

        <form onSubmit={handleSalvar} className="flex flex-col gap-3">
          
          {/* NOME DO VENDEDOR */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Nome do Vendedor</label>
            <input
              type="text"
              required
              placeholder="Ex: Roberto Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-800"
            />
          </div>

          {/* WHATSAPP / CONTATO */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">WhatsApp / Contato</label>
            <input
              type="text"
              required
              placeholder="(98) 98985-4552"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-800"
            />
          </div>

          {/* AUTOCOMPLETE FORNECEDOR */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Empresa / Fornecedor (Digite para Buscar)</label>
            <input
              type="text"
              placeholder="Digite a Razão Social, Fantasia ou CNPJ..."
              value={termoBuscaFornecedor}
              onChange={(e) => {
                setTermoBuscaFornecedor(e.target.value);
                setFornecedorSelecionado(null);
              }}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-800"
            />

            {buscando && (
              <span className="absolute right-4 top-8 text-[10px] font-bold text-[#09797a]">Buscando...</span>
            )}

            {fornecedoresFiltrados.length > 0 && !fornecedorSelecionado && (
              <div className="absolute top-16 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-gray-100">
                {fornecedoresFiltrados.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFornecedorSelecionado(f);
                      setTermoBuscaFornecedor(f.nome_fantasia || f.razao_social);
                      setFornecedoresFiltrados([]);
                    }}
                    className="w-full text-left p-3 hover:bg-emerald-50/50 flex flex-col text-xs font-bold text-gray-800 uppercase transition-colors"
                  >
                    <span>{f.nome_fantasia || f.razao_social}</span>
                    <span className="text-[9px] font-mono text-gray-400 normal-case">CNPJ: {f.cnpj} | Razão: {f.razao_social}</span>
                  </button>
                ))}
              </div>
            )}

            {fornecedorSelecionado && (
              <div className="mt-1 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex justify-between items-center text-[10px] font-bold text-emerald-900">
                <span>✓ {fornecedorSelecionado.nome_fantasia || fornecedorSelecionado.razao_social} ({fornecedorSelecionado.cnpj})</span>
                <button
                  type="button"
                  onClick={() => {
                    setFornecedorSelecionado(null);
                    setTermoBuscaFornecedor('');
                  }}
                  className="text-red-500 hover:text-red-700 font-bold px-1"
                >
                  Trocar
                </button>
              </div>
            )}
          </div>

          {/* SETOR COMERCIAL (SELECT) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Setor Comercial (Pasta Principal)</label>
            <select
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-2xl font-bold text-gray-800 focus:outline-none focus:border-[#09797a]"
            >
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* SUBSETOR (SELECT) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Subsetor (Nicho Confirmado)</label>
            <select
              value={subsetorId}
              onChange={(e) => setSubsetorId(e.target.value)}
              disabled={subsetores.length === 0}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-2xl font-bold text-gray-800 focus:outline-none focus:border-[#09797a] disabled:opacity-50"
            >
              {subsetores.length === 0 ? (
                <option value="">Nenhum subsetor cadastrado</option>
              ) : (
                subsetores.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.nome.toUpperCase()}</option>
                ))
              )}
            </select>
          </div>

          {/* AÇÕES */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onCancelar}
              className="px-5 py-3 rounded-2xl text-xs font-bold bg-gray-100 text-gray-500 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !fornecedorSelecionado}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              {salvando ? 'Gravando...' : 'Gravar Vendedor'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default CadastroVendedor;