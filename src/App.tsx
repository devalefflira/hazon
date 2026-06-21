// Arquivo: src/App.tsx
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import CategoriasHub from './pages/Categorias';
import Usuarios from './pages/Usuarios';
import Permissoes from './pages/Permissoes';
import Fornecedores from './pages/Fornecedores';
import Vendedores from './pages/Vendedores';
import Produtos from './pages/Produtos';
import Inventario from './pages/Inventario';
import NotaFalta from './pages/NotaFalta';
import { Cotacoes } from './pages/Cotacoes';
import { ResponderCotacao } from './pages/Cotacoes/ResponderCotacao';
import { Pedidos } from './pages/Pedidos';
import { FormalizarPedidoExterno } from './pages/Pedidos/FormalizarPedidoExterno';
import { Tarefas } from './pages/Tarefas'; // Adicionado import

interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
  setor?: string;
}

type TelaAtiva = 
  | 'login' 
  | 'home' 
  | 'categorias' 
  | 'usuarios' 
  | 'permissoes' 
  | 'fornecedores' 
  | 'vendedores' 
  | 'produtos' 
  | 'inventario' 
  | 'nota-falta' 
  | 'cotacoes'
  | 'responder_cotacao'
  | 'pedidos'
  | 'formalizar_pedido_externo'
  | 'tarefas'; // Adicionado tipo 'tarefas'

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
  const [tokenAcesso, setTokenAcesso] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenCotacao = params.get('token');
    const tokenPedido = params.get('pedidoToken');

    if (tokenCotacao) {
      setTokenAcesso(tokenCotacao);
      setTelaAtiva('responder_cotacao');
    } else if (tokenPedido) {
      setTokenAcesso(tokenPedido);
      setTelaAtiva('formalizar_pedido_externo');
    }
  }, []);

  const handleLoginSuccess = (usuarioLogado: UsuarioLogado) => {
    setUsuario(usuarioLogado);
    setTelaAtiva('home');
  };

  const handleLogout = () => {
    setUsuario(null);
    setTelaAtiva('login');
  };

  if (telaAtiva === 'responder_cotacao' && tokenAcesso) {
    return <ResponderCotacao token={tokenAcesso} />;
  }

  if (telaAtiva === 'formalizar_pedido_externo' && tokenAcesso) {
    return <FormalizarPedidoExterno token={tokenAcesso} />;
  }

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
        onNavegarParaNotaFalta={() => setTelaAtiva('nota-falta')}
        onNavegarParaCotacoes={() => setTelaAtiva('cotacoes')}
        onNavegarParaPedidos={() => setTelaAtiva('pedidos')}
        onNavegarParaTarefas={() => setTelaAtiva('tarefas')} // Adicionado gatilho de navegação
      />
    );
  }

  if (usuario && telaAtiva === 'categorias') return <CategoriasHub onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'usuarios') return <Usuarios onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'permissoes') return <Permissoes onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'fornecedores') return <Fornecedores onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'vendedores') return <Vendedores onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'produtos') return <Produtos onVoltarParaHome={() => setTelaAtiva('home')} />;

  // ROTA DO MÓDULO DE COTAÇÕES
  if (telaAtiva === 'cotacoes') {
    if (!usuario) {
      return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
          <div className="bg-white p-6 rounded-4xl shadow-xl text-center max-w-85">
            <p className="text-sm font-bold text-gray-600 mb-3">Sessão expirada ou inválida.</p>
            <button onClick={() => setTelaAtiva('login')} className="px-4 h-10 bg-[#09797a] text-white rounded-xl text-xs font-bold">Fazer Login</button>
          </div>
        </div>
      );
    }
    return <Cotacoes usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  // ROTA DO MÓDULO DE PEDIDOS
  if (telaAtiva === 'pedidos') {
    if (!usuario) {
      return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
          <div className="bg-white p-6 rounded-4xl shadow-xl text-center max-w-85">
            <p className="text-sm font-bold text-gray-600 mb-3">Sessão expirada ou inválida.</p>
            <button onClick={() => setTelaAtiva('login')} className="px-4 h-10 bg-[#09797a] text-white rounded-xl text-xs font-bold">Fazer Login</button>
          </div>
        </div>
      );
    }
    return <Pedidos usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  // ROTA DO MÓDULO DE TAREFAS
  if (telaAtiva === 'tarefas') {
    if (!usuario) {
      return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
          <div className="bg-white p-6 rounded-4xl shadow-xl text-center max-w-85">
            <p className="text-sm font-bold text-gray-600 mb-3">Sessão expirada ou inválida.</p>
            <button onClick={() => setTelaAtiva('login')} className="px-4 h-10 bg-[#09797a] text-white rounded-xl text-xs font-bold">Fazer Login</button>
          </div>
        </div>
      );
    }
    return <Tarefas usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'inventario') {
    if (!usuario) {
      return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
          <div className="bg-white p-6 rounded-4xl shadow-xl text-center max-w-85">
            <p className="text-sm font-bold text-gray-600 mb-3">Sessão expirada ou inválida.</p>
            <button onClick={() => setTelaAtiva('login')} className="px-4 h-10 bg-[#09797a] text-white rounded-xl text-xs font-bold">Fazer Login</button>
          </div>
        </div>
      );
    }
    return <Inventario onVoltarParaHome={() => setTelaAtiva('home')} usuarioLogado={usuario} />;
  }

  if (telaAtiva === 'nota-falta') {
    return <NotaFalta onVoltarParaHome={() => setTelaAtiva('home')} usuarioLogado={usuario} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}