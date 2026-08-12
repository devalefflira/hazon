// Arquivo: src/App.tsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
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
import { Tarefas } from './pages/Tarefas';
import Avarias from './pages/Avarias';
import ConfCega from './pages/ConfCega';
import Relatorios from './pages/Relatorios';
import Temperatura from './pages/Temperatura';
import Orcamentos from './pages/Orcamentos';

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
  | 'tarefas'
  | 'avarias'
  | 'conf-cega'
  | 'relatorios'
  | 'temperatura'
  | 'orcamentos';

export default function App() {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [permissoesUsuario, setPermissoesUsuario] = useState<string[]>([]);
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

  // Busca permissões do usuário logado diretamente da tabela no Supabase
  const handleLoginSuccess = async (usuarioLogado: UsuarioLogado) => {
    setUsuario(usuarioLogado);

    try {
      const { data } = await supabase
        .from('usuario_permissoes')
        .select('modulo_nome')
        .eq('usuario_id', usuarioLogado.id)
        .eq('permitido', true);

      const liberados = (data || []).map((p: { modulo_nome: string }) => p.modulo_nome);
      setPermissoesUsuario(liberados);
    } catch (err) {
      console.error('Erro ao buscar permissões do usuário:', err);
      setPermissoesUsuario([]);
    }

    setTelaAtiva('home');
  };

  const handleLogout = () => {
    setUsuario(null);
    setPermissoesUsuario([]);
    setTelaAtiva('login');
  };

  if (telaAtiva === 'responder_cotacao' && tokenAcesso) {
    return <ResponderCotacao token={tokenAcesso} />;
  }

  if (telaAtiva === 'formalizar_pedido_externo' && tokenAcesso) {
    return <FormalizarPedidoExterno token={tokenAcesso} />;
  }

  if (usuario && telaAtiva === 'home') {
    return (
      <Home
        nomeUsuario={usuario.nome}
        perfilUsuario={usuario.perfil}
        permissoesDoUsuario={permissoesUsuario}
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
        onNavegarParaTarefas={() => setTelaAtiva('tarefas')}
        onNavegarParaAvarias={() => setTelaAtiva('avarias')}
        onNavegarParaConfCega={() => setTelaAtiva('conf-cega')}
        onNavegarParaRelatorios={() => setTelaAtiva('relatorios')}
        onNavegarParaTemperatura={() => setTelaAtiva('temperatura')}
        onNavegarParaOrcamentos={() => setTelaAtiva('orcamentos')}
      />
    );
  }

  if (usuario && telaAtiva === 'categorias') return <CategoriasHub onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'usuarios') return <Usuarios onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'permissoes') return <Permissoes onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'fornecedores') return <Fornecedores onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'vendedores') return <Vendedores onVoltarParaHome={() => setTelaAtiva('home')} />;
  if (usuario && telaAtiva === 'produtos') return <Produtos onVoltarParaHome={() => setTelaAtiva('home')} />;

  if (telaAtiva === 'orcamentos') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Orcamentos usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'cotacoes') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Cotacoes usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'pedidos') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Pedidos usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'tarefas') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Tarefas usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'avarias') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Avarias usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'conf-cega') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <ConfCega usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'relatorios') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Relatorios onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'temperatura') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Temperatura usuarioLogadoId={usuario.id} onVoltarParaHome={() => setTelaAtiva('home')} />;
  }

  if (telaAtiva === 'inventario') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Inventario onVoltarParaHome={() => setTelaAtiva('home')} usuarioLogado={usuario} />;
  }

  if (telaAtiva === 'nota-falta') {
    return <NotaFalta onVoltarParaHome={() => setTelaAtiva('home')} usuarioLogado={usuario} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}