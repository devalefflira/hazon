import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

import logoHazon from '../../assets/icones/logo-hazonerp.svg';
import iconUser from '../../assets/icones/icon-user.svg';
import iconPassword from '../../assets/icones/icon-password.svg';

interface LoginProps {
  onLoginSuccess: (usuario: { id: string; nome: string; perfil: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      // Faz a busca no banco de dados trazendo o usuário e o nome do seu perfil atrelado
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id, 
          nome, 
          senha_hash,
          perfis ( nome )
        `)
        .eq('email', email.trim())
        .single(); // Traz apenas um registro

      if (error || !data) {
        setErro('E-mail não encontrado ou incorreto.');
        setLoading(false);
        return;
      }

      // Validação simples de senha (em produção usaremos criptografia hash)
      if (data.senha_hash !== password) {
        setErro('Senha incorreta. Tente novamente.');
        setLoading(false);
        return;
      }

      // Se passou nas validações, extrai o nome do perfil mapeado na relação
      const perfilNome = Array.isArray(data.perfis) 
        ? data.perfis[0]?.nome 
        : (data.perfis as any)?.nome || 'Operacional';

      // Envia os dados para o App.tsx mudar de tela
      onLoginSuccess({
        id: data.id,
        nome: data.nome,
        perfil: perfilNome
      });

    } catch (err) {
      setErro('Falha na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl flex flex-col items-center px-8 py-12">
        
        {/* ÁREA DA LOGO */}
        <div className="mb-10 flex flex-col justify-center items-center w-full">
          <img src={logoHazon} alt="Logo Hazon" className="w-44 h-44 object-contain" />
          <h1 className="text-[#09797a] font-bold text-4xl tracking-wider mt-4 select-none">HAZON</h1>
        </div>

        {/* MENSAGEM DE ERRO (Se houver) */}
        {erro && (
          <div className="w-full bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center font-medium border border-red-200 animate-pulse">
            {erro}
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN */}
        <form onSubmit={handleLogin} className="w-full flex flex-col items-center">
          
          {/* Campo de E-mail */}
          <div className="w-full flex items-center bg-white border border-[#b4b4b4] rounded-[20px] px-4 h-14 mb-5 focus-within:border-[#09797a] focus-within:border-2 transition-all">
            <img src={iconUser} alt="Usuário" className="w-5 h-5 mr-3 select-none" />
            <input 
              type="email" 
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-full bg-transparent outline-none text-[#09797a] placeholder-[#b4b4b4] text-base"
              disabled={loading}
              required
            />
          </div>

          {/* Campo de Senha */}
          <div className="w-full flex items-center bg-white border border-[#b4b4b4] rounded-[20px] px-4 h-14 mb-10 focus-within:border-[#09797a] focus-within:border-2 transition-all">
            <img src={iconPassword} alt="Senha" className="w-5 h-5 mr-3 select-none" />
            <input 
              type="password" 
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-full bg-transparent outline-none text-[#09797a] placeholder-[#b4b4b4] text-base"
              disabled={loading}
              required
            />
          </div>

          {/* Botão Entrar */}
          <button 
            type="submit"
            disabled={loading}
            className="w-[65%] h-12 bg-[#09797a] text-white font-bold text-lg rounded-[30px] hover:bg-[#075f60] active:scale-95 transition-all shadow-md flex justify-center items-center disabled:bg-gray-400"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>

        </form>
      </div>
    </div>
  );
}