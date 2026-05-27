import { useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';

// Definição do tipo de dado do usuário que acabou de logar
interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
}

export default function App() {
  // Guarda as informações do usuário logado. Se estiver "null", o app mostra o Login.
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);

  // Função para limpar a sessão quando o usuário deslogar
  const handleLogout = () => {
    setUsuario(null);
  };

  // Se existir um usuário na memória, renderiza a Home passando os dados e a função de sair
  if (usuario) {
    return (
      <Home 
        nomeUsuario={usuario.nome} 
        perfilUsuario={usuario.perfil} 
        onLogout={handleLogout} 
      />
    );
  }

  // Se não estiver logado, mostra a tela de login e passa a função que salva o usuário logado
  return <Login onLoginSuccess={setUsuario} />;
}