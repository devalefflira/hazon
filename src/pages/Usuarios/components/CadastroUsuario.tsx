import { useState, useEffect } from 'react';
import { usuariosService } from '../services/usuariosService';

interface Perfil {
  id: string;
  nome: string;
}

interface CadastroUsuarioProps {
  onSucesso: () => void;
  onCancelar: () => void;
}

export default function CadastroUsuario({ onSucesso, onCancelar }: CadastroUsuarioProps) {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loadingPerfis, setLoadingPerfis] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Estados dos campos do formulário
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfilId, setPerfilId] = useState('');

  // Carrega os perfis de permissão reais do Supabase para alimentar o Select
  useEffect(() => {
    async function carregarPerfis() {
      try {
        const dados = await usuariosService.listarPerfisDisponiveis();
        setPerfis(dados || []);
      } catch (err) {
        setErro('Erro ao carregar os perfis de permissão do banco.');
      } finally {
        setLoadingPerfis(false);
      }
    }
    carregarPerfis();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !setor.trim() || !email.trim() || !senha.trim() || !perfilId) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');

      await usuariosService.salvarUsuario({
        nome: nome.trim(),
        setor: setor.trim(),
        email: email.trim().toLowerCase(),
        senhaHash: senha, // Mantendo a estrutura direta pedida
        perfilId
      });

      onSucesso(); // Fecha o formulário e recarrega a lista do index
    } catch (err: any) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setErro('Este e-mail já está sendo utilizado por outro usuário.');
      } else {
        setErro('Erro ao salvar o usuário no banco de dados.');
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSalvar} className="w-full flex flex-col gap-4 animate-fadeIn">
      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider select-none mb-1">
        Preencha as Credenciais do Novo Operador
      </p>

      {erro && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 font-medium text-center">
          {erro}
        </div>
      )}

      {/* Nome Completo */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Nome Completo</label>
        <input
          type="text"
          placeholder="Ex: João da Silva"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={salvando}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all"
          required
        />
      </div>

      {/* Setor Operacional */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Setor Interno</label>
        <input
          type="text"
          placeholder="Ex: Prevenção de Perdas, Frente de Loja"
          value={setor}
          onChange={(e) => setSetor(e.target.value)}
          disabled={salvando}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all"
          required
        />
      </div>

      {/* E-mail de Login */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">E-mail (Login corporativo)</label>
        <input
          type="email"
          placeholder="Ex: joao.silva@hazon.com"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s/g, ''))} // Força minúsculas e remove espaços vazios
          disabled={salvando}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all lowercase"
          required
        />
      </div>

      {/* Senha Inicial */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Senha Inicial de Acesso</label>
        <input
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          disabled={salvando}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all"
          required
        />
      </div>

      {/* Perfil de Permissões */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Perfil de Permissão</label>
        <select
          value={perfilId}
          onChange={(e) => setPerfilId(e.target.value)}
          disabled={salvando || loadingPerfis}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all text-gray-700"
          required
        >
          <option value="">{loadingPerfis ? 'Buscando perfis...' : 'Selecione um perfil...'}</option>
          {perfis.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {/* BOTÕES DE AÇÃO MOBILE */}
      <div className="flex gap-2 w-full mt-2">
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="flex-1 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs h-11 active:scale-[0.98] transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="flex-1 bg-[#09797a] text-white font-bold rounded-xl text-xs h-11 active:scale-[0.98] transition-all disabled:bg-gray-300 shadow-sm"
        >
          {salvando ? 'Salvando...' : 'Gravar Usuário'}
        </button>
      </div>
    </form>
  );
}