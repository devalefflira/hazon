import { useState } from 'react';

// Corrigimos o caminho dos ícones (voltando duas pastas com '../../')
import logoHazon from '../../assets/icones/logo-hazonerp.svg';
import iconUser from '../../assets/icones/icon-user.svg';
import iconPassword from '../../assets/icones/icon-password.svg';

// Mudamos o nome da função de App para Login
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Acessando o sistema com o e-mail: ${email}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-[380px] bg-white rounded-[32px] shadow-xl flex flex-col items-center px-8 py-12">
        
        {/* ÁREA DA LOGO */}
        <div className="mb-10 flex flex-col justify-center items-center w-full">
          <img src={logoHazon} alt="Logo Hazon" className="w-44 h-44 object-contain" />
          <h1 className="text-[#09797a] font-bold text-4xl tracking-wider mt-4 select-none">
            HAZON
          </h1>
        </div>

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
              required
            />
          </div>

          {/* Botão Entrar */}
          <button 
            type="submit"
            className="w-[65%] h-12 bg-[#09797a] text-white font-bold text-lg rounded-[30px] hover:bg-[#075f60] active:scale-95 transition-all shadow-md"
          >
            Entrar
          </button>

        </form>
      </div>
    </div>
  );
}