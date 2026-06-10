import { useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import CategoriasHub from './pages/Categorias';
import Usuarios from './pages/Usuarios';
import Permissoes from './pages/Permissoes';
import Fornecedores from './pages/Fornecedores';
import Vendedores from './pages/Vendedores';
import Produtos from './pages/Produtos';
import Inventario from './pages/Inventario'; // Importação do novo módulo

interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
}

// Tipos de telas globais do sistema
type TelaAtiva = 'login' | 'home' | 'categorias' | 'usuarios' | 'permissoes' | 'fornecedores' | 'vendedores' | 'produtos' | 'inventario';

export const MATRIZ_PERMISSOES: Record<string, string[]> = {
  'Administrador': [
    'Usuarios', 'Fornecedores', 'Vendedores', 'Produtos', 'Inventario',
    'Nota de Falta', 'Dashboard', 'Relatorios', 'Cotacoes', 'Avarias',
    'Pedidos', 'Tarefas', 'Conf. Cega', 'Permissoes', 'Categorias'
  ],
  'Gerencial': [
    'Inventario', 'Dashboard', 'Relatorios', 'Cotacoes', 'Avarias', 'Pedidos', 'Tarefas'
  ],
  'Operacional': [
    'Inventario', 'Nota de Falta', 'Avarias', 'Tarefas', 'Conf. Cega'
  ]
};

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

  // 1. RENDERIZAÇÃO DA TELA HOME
  if (usuario && telaAtiva === 'home') {
    return (
      <Home
        nomeUsuario={usuario.nome}
        perfilUsuario={usuario.perfil}
        onLogout={handleLogout}
        onNavegarParaCategorias={() => setTelaAtiva('categorias')}
        onNavegarParaUsuarios={() => setTelaAtiva('usuarios')}
        onNavegarParaPermissoes={() => setTelaAtiva('permissoes')}
        onNavegarParaFornecedores={() => setTelaAtiva('fornecedores')}
        onNavegarParaVendedores={() => setTelaAtiva('vendedores')}
        onNavegarParaProdutos={() => setTelaAtiva('produtos')}
        onNavegarParaInventario={() => setTelaAtiva('inventario')}
      />
    );
  }

  // 2. DIRECIONAMENTO ISOLADO DOS MÓDULOS ATIVOS
  if (usuario && telaAtiva === 'categorias') return <CategoriasHub onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'usuarios') return <Usuarios onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'permissoes') return <Permissoes onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'fornecedores') return <Fornecedores onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'vendedores') return <Vendedores onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'produtos') return <Produtos onVoltarParaHome={() => setTelaAtiva('home')} />;
  
  // Rota do Inventário passando o ID do usuário
  if (usuario && telaAtiva === 'inventario') {
    return <Inventario usuarioId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}