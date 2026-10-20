// src/App.tsx
import { lazy, Suspense, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { PaletaBuscaGlobal } from './components/ui/PaletaBuscaGlobal';
import { useToast } from './components/ui/useToast';
import { ShellAutenticado } from './components/layout/AppShell';
import { temAcesso } from './lib/navegacao/permissoes';
import { useSessao } from './lib/sessao/useSessao';
import type { UsuarioLogado } from './lib/sessao/sessaoContext';

// Telas carregadas sob demanda (lazy): o bundle inicial traz só Login e Home.
const CategoriasHub = lazy(() => import('./pages/Categorias'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Permissoes = lazy(() => import('./pages/Permissoes'));
const Organograma = lazy(() => import('./pages/Organograma'));
const Fornecedores = lazy(() => import('./pages/Fornecedores'));
const Vendedores = lazy(() => import('./pages/Vendedores'));
const Produtos = lazy(() => import('./pages/Produtos'));
const Inventario = lazy(() => import('./pages/Inventario'));
const NotaFalta = lazy(() => import('./pages/NotaFalta'));
const Cotacoes = lazy(() => import('./pages/Cotacoes').then((m) => ({ default: m.Cotacoes })));
const ResponderCotacao = lazy(() =>
  import('./pages/Cotacoes/ResponderCotacao').then((m) => ({ default: m.ResponderCotacao }))
);
const Pedidos = lazy(() => import('./pages/Pedidos').then((m) => ({ default: m.Pedidos })));
const FormalizarPedidoExterno = lazy(() =>
  import('./pages/Pedidos/FormalizarPedidoExterno').then((m) => ({ default: m.FormalizarPedidoExterno }))
);
const Tarefas = lazy(() => import('./pages/Tarefas').then((m) => ({ default: m.Tarefas })));
const Avarias = lazy(() => import('./pages/Avarias'));
const ConsumoLoja = lazy(() => import('./pages/ConsumoLoja'));
const ConfCega = lazy(() => import('./pages/ConfCega'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const Temperatura = lazy(() => import('./pages/Temperatura'));
const Orcamentos = lazy(() => import('./pages/Orcamentos'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Ofertas = lazy(() => import('./pages/Ofertas'));
const Vencimentos = lazy(() => import('./pages/Vencimentos'));
const Notificacoes = lazy(() => import('./pages/Notificacoes'));
const Trocas = lazy(() => import('./pages/Trocas'));
const PesquisaPrecos = lazy(() => import('./pages/PesquisaPrecos'));
const Encartes = lazy(() => import('./pages/Encartes'));
const Solicitacoes = lazy(() => import('./pages/Solicitacoes'));
const Recebimentos = lazy(() => import('./pages/Recebimentos'));
const Mensagens = lazy(() => import('./pages/Mensagens'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RupturaGondola = lazy(() => import('./pages/RupturaGondola'));
const AlmoxarifadoPage = lazy(() =>
  import('./pages/Almoxarifado').then((m) => ({ default: m.AlmoxarifadoPage }))
);

/**
 * Exige usuário logado. Sem sessão, redireciona para /login.
 * Recebe o usuário por função para manter as props tipadas como UsuarioLogado.
 */
function RotaProtegida({ children }: { children: (usuario: UsuarioLogado) => ReactNode }) {
  const { usuario, permissoes, carregando } = useSessao();
  const { pathname } = useLocation();

  if (carregando) return <LoadingScreen />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!temAcesso(pathname, permissoes)) return <AcessoNegado />;
  return <>{children(usuario)}</>;
}

/** Avisa que o módulo não está liberado e devolve o usuário para a Home. */
function AcessoNegado() {
  const { mostrarAviso } = useToast();
  const avisado = useRef(false);

  useEffect(() => {
    if (avisado.current) return;
    avisado.current = true;
    mostrarAviso('Você não tem acesso a este módulo.', 'aviso');
  }, [mostrarAviso]);

  return <Navigate to="/home" replace />;
}

/**
 * Raiz do site. Mantém os links externos existentes:
 * ?token= (responder cotação) e ?pedidoToken= (formalizar pedido).
 */
function RaizRota() {
  const [parametros] = useSearchParams();
  const { usuario, carregando } = useSessao();
  const tokenCotacao = parametros.get('token');
  const tokenPedido = parametros.get('pedidoToken');

  if (tokenCotacao) return <ResponderCotacao token={tokenCotacao} />;
  if (tokenPedido) return <FormalizarPedidoExterno token={tokenPedido} />;
  if (carregando) return <LoadingScreen />;

  return <Navigate to={usuario ? '/home' : '/login'} replace />;
}

function LoginRota() {
  const { usuario, entrar, carregando } = useSessao();
  if (carregando) return <LoadingScreen />;
  if (usuario) return <Navigate to="/home" replace />;
  return <Login onLoginSuccess={(novo: UsuarioLogado) => entrar(novo)} />;
}

function RotasHazon() {
  const navigate = useNavigate();
  const { usuario, permissoes, sair } = useSessao();

  const voltarParaHome = () => navigate('/home');

  const sairEIrParaLogin = async () => {
    await sair();
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      <Route path="/" element={<RaizRota />} />
      <Route path="/login" element={<LoginRota />} />

      <Route
        path="/home"
        element={
          <RotaProtegida>
            {(u) => (
              <Home
                nomeUsuario={u.nome}
                perfilUsuario={u.perfil}
                usuarioLogadoId={u.id}
                permissoesDoUsuario={permissoes}
                onLogout={sairEIrParaLogin}
                onNavegar={(tela: string) => navigate(`/${tela}`)}
              />
            )}
          </RotaProtegida>
        }
      />

      <Route element={<ShellAutenticado />}>
      <Route
        path="/dashboard"
        element={<RotaProtegida>{() => <Dashboard onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/ruptura-gondola"
        element={
          <RotaProtegida>
            {(u) => <RupturaGondola usuarioLogadoId={u.id} onVoltarParaHome={voltarParaHome} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/clientes"
        element={<RotaProtegida>{() => <Clientes onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/ofertas"
        element={
          <RotaProtegida>
            {(u) => <Ofertas onVoltarParaHome={voltarParaHome} usuarioLogado={u} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/vencimentos"
        element={
          <RotaProtegida>
            {(u) => (
              <Vencimentos
                onVoltarParaHome={voltarParaHome}
                usuarioLogado={u}
                onDirecionarParaAvaria={() => navigate('/avarias')}
              />
            )}
          </RotaProtegida>
        }
      />
      <Route
        path="/trocas"
        element={
          <RotaProtegida>
            {(u) => <Trocas onVoltarParaHome={voltarParaHome} usuarioLogado={u} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/pesquisa-precos"
        element={
          <RotaProtegida>
            {(u) => (
              <PesquisaPrecos
                onVoltarParaHome={voltarParaHome}
                usuarioLogado={u}
                usuarioLogadoId={u.id}
                onNavegarParaOfertas={() => navigate('/ofertas')}
              />
            )}
          </RotaProtegida>
        }
      />
      <Route
        path="/notificacoes"
        element={
          <RotaProtegida>
            {(u) => (
              <Notificacoes
                onVoltarParaHome={voltarParaHome}
                onNavegarParaVencimentos={() => navigate('/vencimentos')}
                usuarioLogado={u}
              />
            )}
          </RotaProtegida>
        }
      />
      <Route
        path="/almoxarifado"
        element={<RotaProtegida>{() => <AlmoxarifadoPage onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/categorias"
        element={<RotaProtegida>{() => <CategoriasHub onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/organograma"
        element={<RotaProtegida>{() => <Organograma onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/usuarios"
        element={<RotaProtegida>{() => <Usuarios onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/permissoes"
        element={<RotaProtegida>{() => <Permissoes onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/fornecedores"
        element={<RotaProtegida>{() => <Fornecedores onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/vendedores"
        element={<RotaProtegida>{() => <Vendedores onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/produtos"
        element={<RotaProtegida>{() => <Produtos onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/orcamentos"
        element={
          <RotaProtegida>
            {(u) => <Orcamentos usuarioLogadoId={u.id} onVoltarParaHome={voltarParaHome} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/cotacoes"
        element={
          <RotaProtegida>
            {(u) => <Cotacoes usuarioLogadoId={u.id} onVoltarParaHome={voltarParaHome} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/pedidos"
        element={
          <RotaProtegida>
            {(u) => <Pedidos usuarioLogadoId={u.id} onVoltarParaHome={voltarParaHome} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/tarefas"
        element={
          <RotaProtegida>
            {(u) => <Tarefas usuarioLogadoId={u.id} onVoltarParaHome={voltarParaHome} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/avarias"
        element={
          <RotaProtegida>
            {(u) => (
              <Avarias onVoltarParaHome={voltarParaHome} usuarioLogado={u} usuarioLogadoId={u.id} />
            )}
          </RotaProtegida>
        }
      />
      <Route
        path="/consumo-loja"
        element={
          <RotaProtegida>
            {(u) => (
              <ConsumoLoja onVoltarParaHome={voltarParaHome} usuarioLogado={u} usuarioLogadoId={u.id} />
            )}
          </RotaProtegida>
        }
      />
      <Route
        path="/conf-cega"
        element={
          <RotaProtegida>
            {(u) => <ConfCega usuarioLogadoId={u.id} onVoltarParaHome={voltarParaHome} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/relatorios"
        element={<RotaProtegida>{() => <Relatorios onVoltarParaHome={voltarParaHome} />}</RotaProtegida>}
      />
      <Route
        path="/temperatura"
        element={
          <RotaProtegida>
            {(u) => <Temperatura usuarioLogadoId={u.id} onVoltarParaHome={voltarParaHome} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/inventario"
        element={
          <RotaProtegida>
            {(u) => <Inventario onVoltarParaHome={voltarParaHome} usuarioLogado={u} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/encartes"
        element={
          <RotaProtegida>
            {(u) => <Encartes onVoltarParaHome={voltarParaHome} usuarioLogado={u} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/solicitacoes"
        element={
          <RotaProtegida>
            {(u) => (
              <Solicitacoes onVoltarParaHome={voltarParaHome} usuarioLogado={u} usuarioLogadoId={u.id} />
            )}
          </RotaProtegida>
        }
      />
      <Route
        path="/recebimentos"
        element={
          <RotaProtegida>
            {(u) => <Recebimentos onVoltarParaHome={voltarParaHome} usuarioLogadoId={u.id} />}
          </RotaProtegida>
        }
      />
      <Route
        path="/mensagens"
        element={
          <RotaProtegida>
            {(u) => <Mensagens onVoltarParaHome={voltarParaHome} usuarioLogadoId={u.id} />}
          </RotaProtegida>
        }
      />
      {/* Nota de Falta não exige sessão na versão atual, mantido igual ao comportamento anterior */}
      <Route
        path="/nota-falta"
        element={<NotaFalta onVoltarParaHome={voltarParaHome} usuarioLogado={usuario} />}
      />

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <RotasHazon />
      </Suspense>
      <PaletaBuscaGlobal />
    </>
  );
}
