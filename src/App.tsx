import { useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import CategoriasHub from './pages/Categorias';

interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
}

// Tipos de telas globais do sistema
type TelaAtiva = 'login' | 'home' | 'categorias';

export default function App() {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [telaAtiva, setTelaAtiva] = useState<TelaAtiva>('login');

  const handleLoginSuccess = (usuarioLogado: UsuarioLogado) => {
    setUsuario(usuarioLogado);
    setTelaAtiva('home'); // Após logar, joga para a Home
  };

  const handleLogout = () => {
    setUsuario(null);
    setTelaAtiva('login'); // Ao deslogar, limpa e joga para o Login
  };

  // RENDERIZAÇÃO CONDICIONAL BASEADA NA ARQUITETURA DE ESTADOS
  if (usuario && telaAtiva === 'home') {
    return (
      <Home 
        nomeUsuario={usuario.nome} 
        perfilUsuario={usuario.perfil} 
        onLogout={handleLogout}
        onNavegarParaCategorias={() => setTelaAtiva('categorias')} // Envia a rota para a Home
      />
    );
  }

  if (usuario && telaAtiva === 'categorias') {
    return (
      <CategoriasHub 
        onVoltarParaHome={() => setTelaAtiva('home')} // Envia a rota de retorno para o Hub
      />
    );
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}