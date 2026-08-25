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
import ConsumoLoja from './pages/ConsumoLoja';
import ConfCega from './pages/ConfCega';
import Relatorios from './pages/Relatorios';
import Temperatura from './pages/Temperatura';
import Orcamentos from './pages/Orcamentos';
import Clientes from './pages/Clientes';
import Ofertas from './pages/Ofertas';
import Vencimentos from './pages/Vencimentos';
import Notificacoes from './pages/Notificacoes';
import Trocas from './pages/Trocas';
import PesquisaPrecos from './pages/PesquisaPrecos';

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
  | 'consumo-loja'
  | 'conf-cega'
  | 'relatorios'
  | 'temperatura'
  | 'orcamentos'
  | 'clientes'
  | 'ofertas'
  | 'vencimentos'
  | 'notificacoes'
  | 'trocas'
  | 'pesquisa-precos';

export default function App() {
  // 1. Inicializa o usuário direto do localStorage para não perder sessão no F5
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(() => {
    try {
      const salvo = localStorage.getItem('hazon_user');
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  // 2. Inicializa as permissões do usuário salvas
  const [permissoesUsuario, setPermissoesUsuario] = useState<string[]>(() => {
    try {
      const salvas = localStorage.getItem('hazon_permissoes');
      return salvas ? JSON.parse(salvas) : [];
    } catch {
      return [];
    }
  });

  // 3. Inicializa a tela onde o usuário estava antes do F5
  const [telaAtiva, setTelaAtiva] = useState<TelaAtiva>(() => {
    try {
      const userSalvo = localStorage.getItem('hazon_user');
      const telaSalva = localStorage.getItem('hazon_tela_ativa') as TelaAtiva;
      if (userSalvo && telaSalva && telaSalva !== 'login') {
        return telaSalva;
      }
      return userSalvo ? 'home' : 'login';
    } catch {
      return 'login';
    }
  });

  const [tokenAcesso, setTokenAcesso] = useState<string | null>(null);

  // Função auxiliar para mudar tela e persistir no storage
  const mudarTela = (novaTela: TelaAtiva) => {
    setTelaAtiva(novaTela);
    localStorage.setItem('hazon_tela_ativa', novaTela);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenCotacao = params.get('token');
    const tokenPedido = params.get('pedidoToken');

    if (tokenCotacao) {
      setTokenAcesso(tokenCotacao);
      mudarTela('responder_cotacao');
    } else if (tokenPedido) {
      setTokenAcesso(tokenPedido);
      mudarTela('formalizar_pedido_externo');
    }
  }, []);

  const handleLoginSuccess = async (usuarioLogado: UsuarioLogado) => {
    setUsuario(usuarioLogado);
    localStorage.setItem('hazon_user', JSON.stringify(usuarioLogado));

    try {
      const { data } = await supabase
        .from('usuario_permissoes')
        .select('modulo_nome')
        .eq('usuario_id', usuarioLogado.id)
        .eq('permitido', true);

      const liberados = (data || []).map((p: { modulo_nome: string }) => p.modulo_nome);
      setPermissoesUsuario(liberados);
      localStorage.setItem('hazon_permissoes', JSON.stringify(liberados));
    } catch (err) {
      console.error('Erro ao buscar permissões do usuário:', err);
      setPermissoesUsuario([]);
    }

    mudarTela('home');
  };

  const handleLogout = () => {
    setUsuario(null);
    setPermissoesUsuario([]);
    localStorage.removeItem('hazon_user');
    localStorage.removeItem('hazon_permissoes');
    localStorage.removeItem('hazon_tela_ativa');
    mudarTela('login');
  };

  if (telaAtiva === 'responder_cotacao' && tokenAcesso) {
    return <ResponderCotacao token={tokenAcesso} />;
  }

  if (telaAtiva === 'formalizar_pedido_externo' && tokenAcesso) {
    return <FormalizarPedidoExterno token={tokenAcesso} />;
  }

  if (telaAtiva === 'clientes') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Clientes onVoltarParaHome={() => mudarTela('home')} />;
  }

  if (telaAtiva === 'ofertas') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Ofertas onVoltarParaHome={() => mudarTela('home')} usuarioLogado={usuario} />;
  }

  if (telaAtiva === 'vencimentos') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return (
      <Vencimentos
        onVoltarParaHome={() => mudarTela('home')}
        usuarioLogado={usuario}
        onDirecionarParaAvaria={() => mudarTela('avarias')}
      />
    );
  }

  if (telaAtiva === 'trocas') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Trocas onVoltarParaHome={() => mudarTela('home')} usuarioLogado={usuario} />;
  }

  if (telaAtiva === 'pesquisa-precos') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return (
      <PesquisaPrecos
        onVoltarParaHome={() => mudarTela('home')}
        usuarioLogado={usuario}
        usuarioLogadoId={usuario.id}
        onNavegarParaOfertas={() => mudarTela('ofertas')}
      />
    );
  }

  if (telaAtiva === 'notificacoes') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return (
      <Notificacoes
        onVoltarParaHome={() => mudarTela('home')}
        onNavegarParaVencimentos={() => mudarTela('vencimentos')}
        usuarioLogado={usuario}
      />
    );
  }

  if (usuario && telaAtiva === 'home') {
    return (
      <Home
        nomeUsuario={usuario.nome}
        perfilUsuario={usuario.perfil}
        usuarioLogadoId={usuario.id}
        permissoesDoUsuario={permissoesUsuario}
        onLogout={handleLogout}
        onNavegar={(tela: string) => mudarTela(tela as TelaAtiva)}
        onNavegarParaCategorias={() => mudarTela('categorias')}
        onNavegarParaUsuarios={() => mudarTela('usuarios')}
        onNavegarParaPermissoes={() => mudarTela('permissoes')}
        onNavegarParaFornecedores={() => mudarTela('fornecedores')}
        onNavegarParaVendedores={() => mudarTela('vendedores')}
        onNavegarParaProdutos={() => mudarTela('produtos')}
        onNavegarParaInventario={() => mudarTela('inventario')}
        onNavegarParaNotaFalta={() => mudarTela('nota-falta')}
        onNavegarParaCotacoes={() => mudarTela('cotacoes')}
        onNavegarParaPedidos={() => mudarTela('pedidos')}
        onNavegarParaTarefas={() => mudarTela('tarefas')}
        onNavegarParaAvarias={() => mudarTela('avarias')}
        onNavegarParaConsumoLoja={() => mudarTela('consumo-loja')}
        onNavegarParaConfCega={() => mudarTela('conf-cega')}
        onNavegarParaRelatorios={() => mudarTela('relatorios')}
        onNavegarParaTemperatura={() => mudarTela('temperatura')}
        onNavegarParaOrcamentos={() => mudarTela('orcamentos')}
        onNavegarParaClientes={() => mudarTela('clientes')}
        onNavegarParaOfertas={() => mudarTela('ofertas')}
        onNavegarParaVencimentos={() => mudarTela('vencimentos')}
        onNavegarParaTrocas={() => mudarTela('trocas')}
        onNavegarParaPesquisaPrecos={() => mudarTela('pesquisa-precos')}
        onNavegarParaNotificacoes={() => mudarTela('notificacoes')}
      />
    );
  }

  if (usuario && telaAtiva === 'categorias') return <CategoriasHub onVoltarParaHome={() => mudarTela('home')} />;
  if (usuario && telaAtiva === 'usuarios') return <Usuarios onVoltarParaHome={() => mudarTela('home')} />;
  if (usuario && telaAtiva === 'permissoes') return <Permissoes onVoltarParaHome={() => mudarTela('home')} />;
  if (usuario && telaAtiva === 'fornecedores') return <Fornecedores onVoltarParaHome={() => mudarTela('home')} />;
  if (usuario && telaAtiva === 'vendedores') return <Vendedores onVoltarParaHome={() => mudarTela('home')} />;
  if (usuario && telaAtiva === 'produtos') return <Produtos onVoltarParaHome={() => mudarTela('home')} />;

  if (telaAtiva === 'orcamentos') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Orcamentos usuarioLogadoId={usuario.id} onVoltarParaHome={() => mudarTela('home')} />;
  }

  if (telaAtiva === 'cotacoes') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Cotacoes usuarioLogadoId={usuario.id} onVoltarParaHome={() => mudarTela('home')} />;
  }

  if (telaAtiva === 'pedidos') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Pedidos usuarioLogadoId={usuario.id} onVoltarParaHome={() => mudarTela('home')} />;
  }

  if (telaAtiva === 'tarefas') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Tarefas usuarioLogadoId={usuario.id} onVoltarParaHome={() => mudarTela('home')} />;
  }

  if (telaAtiva === 'avarias') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return (
      <Avarias
        onVoltarParaHome={() => mudarTela('home')}
        usuarioLogado={usuario}
        usuarioLogadoId={usuario.id}
      />
    );
  }

  if (telaAtiva === 'consumo-loja') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return (
      <ConsumoLoja
        onVoltarParaHome={() => mudarTela('home')}
        usuarioLogado={usuario}
        usuarioLogadoId={usuario.id}
      />
    );
  }

  if (telaAtiva === 'conf-cega') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <ConfCega usuarioLogadoId={usuario.id} onVoltarParaHome={() => mudarTela('home')} />;
  }

  if (telaAtiva === 'relatorios') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Relatorios onVoltarParaHome={() => mudarTela('home')} />;
  }

  if (telaAtiva === 'temperatura') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Temperatura usuarioLogadoId={usuario.id} onVoltarParaHome={() => mudarTela('home')} />;
  }

  if (telaAtiva === 'inventario') {
    if (!usuario) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <Inventario onVoltarParaHome={() => mudarTela('home')} usuarioLogado={usuario} />;
  }

  if (telaAtiva === 'nota-falta') {
    return <NotaFalta onVoltarParaHome={() => mudarTela('home')} usuarioLogado={usuario} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}