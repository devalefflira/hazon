import { useState } from 'react';
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
import {ResponderCotacao} from './pages/Cotacoes/ResponderCotacao';

interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
  setor?: string;
}

// Tipos de telas globais do sistema
type TelaAtiva = 'login' | 'home' | 'categorias' | 'usuarios' | 'permissoes' | 'fornecedores' | 'vendedores' | 'produtos' | 'inventario' | 'nota-falta' | 'cotacoes';

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
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFornecedor = urlParams.get('token');

  if (tokenFornecedor) {
    return <ResponderCotacao token={tokenFornecedor} />;
  }

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
        onNavegarParaNotaFalta={() => setTelaAtiva('nota-falta')}
        onNavegarParaCotacoes={() => setTelaAtiva('cotacoes')}
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

  // ROTA DO MÓDULO DE COTAÇÕES
if (telaAtiva === 'cotacoes') {
  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
        <div className="bg-white p-6 rounded-4xl shadow-xl text-center max-w-85">
          <p className="text-sm font-bold text-gray-600 mb-3">Sessão expirada ou inválida.</p>
          <button
            onClick={() => setTelaAtiva('login')}
            className="px-4 h-10 bg-[#09797a] text-white rounded-xl text-xs font-bold"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  // AJUSTE OPERACIONAL DEFINITIVO:
  // Injeta diretamente a propriedade de ID extraída dinamicamente do objeto 'usuario' da sessão
  return (
    <Cotacoes
      usuarioLogadoId={usuario.id}
    />
  );
}
  // Rota do Inventário blindada contra concorrência de estado nulo
  if (telaAtiva === 'inventario') {
    if (!usuario) {
      return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
          <div className="bg-white p-6 rounded-4xl shadow-xl text-center max-w-85">
            <p className="text-sm font-bold text-gray-600 mb-3">Sessão expirada ou inválida.</p>
            <button
              onClick={() => setTelaAtiva('login')}
              className="px-4 h-10 bg-[#09797a] text-white rounded-xl text-xs font-bold"
            >
              Fazer Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <Inventario
        onVoltarParaHome={() => setTelaAtiva('home')}
        usuarioLogado={usuario}
      />
    );
  }

  // Rota da Nota de Falta
  if (telaAtiva === 'nota-falta') {
    return (
      <NotaFalta
        onVoltarParaHome={() => setTelaAtiva('home')}
        usuarioLogado={usuario}
      />
    );
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}