import { useState } from 'react';
import { fornecedoresService } from '../services/fornecedoresService';

interface CadastroProps {
  onSucesso: () => void;
  onCancelar: () => void;
}

export default function CadastroFornecedor({ onSucesso, onCancelar }: CadastroProps) {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Aplica máscara de CNPJ dinamicamente (00.000.000/0000-00)
  const handleCnpjChange = (value: string) => {
    const apenasNumeros = value.replace(/\D/g, '').slice(0, 14);
    
    const cnpjFormatado = apenasNumeros
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');

    setCnpj(cnpjFormatado);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim() || !nomeFantasia.trim() || !cnpj.trim()) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    if (cnpj.replace(/\D/g, '').length !== 14) {
      setErro('O CNPJ digitado está incompleto.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');

      await fornecedoresService.salvarFornecedor({
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cnpj
      });

      onSucesso();
    } catch (err: any) {
      setErro(err.message?.includes('duplicate') ? 'Este CNPJ já está cadastrado no sistema.' : 'Erro ao salvar o fornecedor.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSalvar} className="w-full flex flex-col gap-4 animate-fadeIn">
      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider pl-0.5 mb-1">
        Novo Parceiro Comercial
      </p>

      {erro && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 text-center font-medium">{erro}</div>}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Nome Fantasia</label>
        <input
          type="text"
          placeholder="Ex: Coca-Cola Femsa"
          value={nomeFantasia}
          onChange={(e) => setNomeFantasia(e.target.value)}
          disabled={salvando}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all font-semibold"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Razão Social</label>
        <input
          type="text"
          placeholder="Ex: Recofarma Indústria do Amazonas Ltda"
          value={razaoSocial}
          onChange={(e) => setRazaoSocial(e.target.value)}
          disabled={salvando}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">CNPJ</label>
        <input
          type="text"
          inputMode="numeric" // Força abrir o teclado numérico no celular
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => handleCnpjChange(e.target.value)}
          disabled={salvando}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all font-mono tracking-wider font-bold"
          required
        />
      </div>

      <div className="flex gap-2 w-full mt-3">
        <button type="button" onClick={onCancelar} disabled={salvando} className="flex-1 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs h-11">
          Cancelar
        </button>
        <button type="submit" disabled={salvando} className="flex-1 bg-[#09797a] text-white font-bold rounded-xl text-xs h-11 shadow-sm">
          {salvando ? 'Salvando...' : 'Gravar Fornecedor'}
        </button>
      </div>
    </form>
  );
}