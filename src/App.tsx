import { useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import CategoriasHub from './pages/Categorias';
import Usuarios from './pages/Usuarios';

interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
}

// Tipos de telas globais do sistema
type TelaAtiva = 'login' | 'home' | 'categorias' | 'usuarios';

export default function App() {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [telaAtiva, setTelaAtiva] = useState<TelaAtiva>('login');

  const handleLoginSuccess = (usuarioLogado: UsuarioLogado) => {
    setUsuario(usuarioLogado);
    setTelaAtiva('home');
  };

  const handleLogout = () => {
    setUsuario(null);
    setTelaAtiva('login');
  };

  // RENDERIZAÇÃO CONDICIONAL
  if (usuario && telaAtiva === 'home') {
    return (
      <Home 
        nomeUsuario={usuario.nome} 
        perfilUsuario={usuario.perfil} 
        onLogout={handleLogout}
        onNavegarParaCategorias={() => setTelaAtiva('categorias')}
        onNavegarParaUsuarios={() => setTelaAtiva('usuarios')} // <--- Injetado!
      />
    );
  }

  if (usuario && telaAtiva === 'categorias') {
    return <CategoriasHub onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (usuario && telaAtiva === 'usuarios') {
    return <Usuarios onVoltarParaHome={() => setTelaAtiva('home')} />; // <--- Injetado!
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}