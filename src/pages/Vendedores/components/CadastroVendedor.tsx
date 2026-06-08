import { useState, useEffect } from 'react';
import { vendedoresService } from '../services/vendedoresService';

interface ItemSimples {
  id: string;
  nome?: string;
  nome_fantasia?: string;
}

interface CadastroProps {
  onSucesso: () => void;
  onCancelar: () => void;
}

export default function CadastroVendedor({ onSucesso, onCancelar }: CadastroProps) {
  const [loadingListas, setLoadingListas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Listas de alimentação dos Dropdowns
  const [fornecedores, setFornecedores] = useState<ItemSimples[]>([]);
  const [setores, setSetores] = useState<ItemSimples[]>([]);
  const [subsetores, setSubsetores] = useState<ItemSimples[]>([]);

  // Estados dos campos do formulário
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [subsetorId, setSubsetorId] = useState('');

  // Carga inicial dos Fornecedores e dos Setores (Categorias Pai)
  useEffect(() => {
    async function carregarDadosIniciais() {
      try {
        setLoadingListas(true);
        const [dadosF, dadosS] = await Promise.all([
          vendedoresService.listarFornecedores(),
          vendedoresService.listarSetores()
        ]);
        setFornecedores(dadosF || []);
        setSetores(dadosS || []);
      } catch (err) {
        setErro('Erro ao carregar dados relacionais do banco.');
      } finally {
        setLoadingListas(false);
      }
    }
    carregarDadosIniciais();
  }, []);

  // Monitora a escolha do Setor para buscar os Subsetores correspondentes
  useEffect(() => {
    async function carregarSubsetores() {
      if (!setorId) {
        setSubsetores([]);
        setSubsetorId('');
        return;
      }

      try {
        const dadosSub = await vendedoresService.listarSubsetores(setorId);
        setSubsetores(dadosSub || []);
        setSubsetorId(''); // Limpa a escolha anterior do subsetor
      } catch (err) {
        setErro('Erro ao carregar os subsetores desse segmento.');
      }
    }
    carregarSubsetores();
  }, [setorId]);

  // Máscara dinâmica de Celular/Telefone ( (99) 99999-9999 )
  const handleTelefoneChange = (value: string) => {
    const num = value.replace(/\D/g, '').slice(0, 11);
    const formatado = num
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
    setTelefone(formatado);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim() || !fornecedorId || !setorId || !subsetorId) {
      setErro('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');

      await vendedoresService.salvarVendedor({
        nome,
        telefone,
        fornecedorId,
        setorId,
        subsetorId
      });

      onSucesso();
    } catch (err) {
      setErro('Erro ao salvar o representante no Supabase.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSalvar} className="w-full flex flex-col gap-4 animate-fadeIn">
      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider pl-0.5 mb-1">
        Ficha do Representante Comercial
      </p>

      {erro && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 text-center font-medium">{erro}</div>}

      {/* Nome do Vendedor */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Nome do Vendedor</label>
        <input
          type="text"
          placeholder="Ex: Roberto Alcantara"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={salvando || loadingListas}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all font-semibold"
          required
        />
      </div>

      {/* WhatsApp / Telefone */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">WhatsApp / Contato</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(e) => handleTelefoneChange(e.target.value)}
          disabled={salvando || loadingListas}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all font-bold"
          required
        />
      </div>

      {/* Fornecedor Vinculado */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Empresa / Fornecedor</label>
        <select
          value={fornecedorId}
          onChange={(e) => setFornecedorId(e.target.value)}
          disabled={salvando || loadingListas}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white text-gray-700 font-medium"
          required
        >
          <option value="">{loadingListas ? 'Buscando parceiros...' : 'Selecione a empresa...'}</option>
          {fornecedores.map(f => (
            <option key={f.id} value={f.id}>{f.nome_fantasia}</option>
          ))}
        </select>
      </div>

      {/* Setor Relacional (Pasta) */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Setor Comercial (Pasta Principal)</label>
        <select
          value={setorId}
          onChange={(e) => setSetorId(e.target.value)}
          disabled={salvando || loadingListas}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white text-gray-700 font-medium"
          required
        >
          <option value="">Selecione o setor...</option>
          {setores.map(s => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>

      {/* Subsetor Filtrado */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Subsetor (Nicho Confirmado)</label>
        <select
          value={subsetorId}
          onChange={(e) => setSubsetorId(e.target.value)}
          disabled={salvando || !setorId || subsetores.length === 0}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white text-gray-700 font-medium disabled:opacity-60"
          required
        >
          {!setorId ? (
            <option value="">Aguardando seleção do setor...</option>
          ) : subsetores.length === 0 ? (
            <option value="">Nenhum subsetor cadastrado para este setor</option>
          ) : (
            <>
              <option value="">Selecione o subsetor...</option>
              {subsetores.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.nome}</option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* Ações */}
      <div className="flex gap-2 w-full mt-2">
        <button type="button" onClick={onCancelar} disabled={salvando} className="flex-1 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs h-11">
          Cancelar
        </button>
        <button type="submit" disabled={salvando || loadingListas} className="flex-1 bg-[#09797a] text-white font-bold rounded-xl text-xs h-11 shadow-sm">
          {salvando ? 'Salvando...' : 'Gravar Vendedor'}
        </button>
      </div>
    </form>
  );
}