// src/lib/navegacao/permissoes.ts

/**
 * Caminho da rota -> chave gravada em usuario_permissoes.modulo_nome.
 *  - String: o usuário precisa ter essa permissão liberada.
 *  - null: módulo sem chave cadastrada, liberado para todos.
 *  - Caminho ausente do mapa (login, home, etc.): liberado.
 *
 * As chaves devem ser idênticas a LISTA_MODULOS_SISTEMA
 * (src/pages/Permissoes/services/permissoesService.ts).
 */
export const CHAVE_PERMISSAO_POR_ROTA: Record<string, string | null> = {
  '/dashboard': 'Dashboard',
  '/relatorios': 'Relatorios',
  '/tarefas': 'Tarefas',
  '/pedidos': 'Pedidos',
  '/orcamentos': 'Orcamentos',
  '/cotacoes': 'Cotacoes',
  '/pesquisa-precos': 'PesquisaPrecos',
  '/ofertas': 'Ofertas',
  '/clientes': 'Clientes',
  '/vendedores': 'Vendedores',
  '/inventario': 'Inventario',
  '/nota-falta': 'Nota de Falta',
  '/avarias': 'Avarias',
  '/consumo-loja': 'ConsumoLoja',
  '/conf-cega': 'Conf. Cega',
  '/produtos': 'Produtos',
  '/trocas': 'Trocas',
  '/vencimentos': 'Vencimentos',
  '/temperatura': 'Temperatura',
  '/usuarios': 'Usuarios',
  '/permissoes': 'Permissoes',
  '/fornecedores': 'Fornecedores',
  '/categorias': 'Categorias',

  // Módulos sem chave de permissão: liberados para todos (decisão registrada)
  '/almoxarifado': null,
  '/ruptura-gondola': null,
  '/recebimentos': null,
  '/encartes': null,
  '/solicitacoes': null,
  '/mensagens': null,
  '/notificacoes': null,
};

export function temAcesso(caminho: string, permissoes: string[]): boolean {
  if (!(caminho in CHAVE_PERMISSAO_POR_ROTA)) return true;
  const chave = CHAVE_PERMISSAO_POR_ROTA[caminho];
  if (chave === null) return true;
  return permissoes.includes(chave);
}
