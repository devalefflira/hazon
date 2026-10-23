// src/lib/navegacao/modulos.ts

export type CategoriaModulo = 'indicadores' | 'comercial' | 'estoque' | 'administracao';

export interface ModuloNavegacao {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaModulo;
  caminho: string;
}

/** Evento global usado para abrir a busca de módulos (ex.: botão na Home). */
export const EVENTO_ABRIR_BUSCA = 'hazon:abrir-busca';

export const CATEGORIAS_TITULO: Record<CategoriaModulo, string> = {
  indicadores: 'Indicadores',
  comercial: 'Comercial',
  estoque: 'Estoque',
  administracao: 'Administração',
};

const modulo = (
  id: string,
  nome: string,
  descricao: string,
  categoria: CategoriaModulo
): ModuloNavegacao => ({ id, nome, descricao, categoria, caminho: `/${id}` });

// Mesma fonte de nomes e descrições do menu da Home. Quando o menu for redesenhado (Fase 3),
// a Home passa a consumir esta lista em vez de manter a própria cópia.
export const MODULOS: ModuloNavegacao[] = [
  modulo('dashboard', 'Dashboard', 'Indicadores e métricas gerenciais', 'indicadores'),
  modulo('relatorios', 'Relatórios', 'Emissão e auditoria em PDF', 'indicadores'),
  modulo('tarefas', 'Tarefas', 'Gestão de atividades operacionais', 'indicadores'),
  modulo('pedidos', 'Pedidos', 'Formalização e ordens de compra', 'comercial'),
  modulo('orcamentos', 'Orçamentos', 'Propostas comerciais e vendas', 'comercial'),
  modulo('cotacoes', 'Cotações', 'Tomada de preço com fornecedores', 'comercial'),
  modulo('pesquisa-precos', 'Pesquisa de Preços', 'Inteligência e análise concorrencial', 'comercial'),
  modulo('encartes', 'Encartes', 'Gerador de cartazes e encartes', 'comercial'),
  modulo('ofertas', 'Ofertas', 'Campanhas, encartes e placas', 'comercial'),
  modulo('assistente-precificacao', 'Assistente de Precificação', 'Análise de custos, margens e sugestões de preço', 'comercial'),
  modulo('auditoria-precificacao', 'Auditoria de Precificação', 'Conferência de preços na gôndola por seção', 'comercial'),
  modulo('clientes', 'Clientes', 'Cadastro de compradores', 'comercial'),
  modulo('vendedores', 'Vendedores', 'Representantes e atendimento', 'comercial'),
  modulo('almoxarifado', 'Almoxarifado', 'Controle de insumos, bobinas e escritório', 'estoque'),
  modulo('ruptura-gondola', 'Ruptura de Gôndola', 'Auditoria de presença e falta no salão', 'estoque'),
  modulo('recebimentos', 'Recebimentos', 'Ciclo operacional e esteira de mercadorias', 'estoque'),
  modulo('conf-cega', 'Conferência Cega', 'Conferência de descargas e NF-e', 'estoque'),
  modulo('produtos', 'Produtos', 'Catálogo de códigos e custos', 'estoque'),
  modulo('inventario', 'Inventário', 'Auditoria e contagem de itens', 'estoque'),
  modulo('nota-falta', 'Nota de Falta', 'Controle de ruptura de estoque', 'estoque'),
  modulo('avarias', 'Avarias', 'Registro de quebras e perdas', 'estoque'),
  modulo('consumo-loja', 'Consumo Loja', 'Controle de materiais internos', 'estoque'),
  modulo('solicitacoes', 'Solicitações', 'Pedidos e requisições entre setores', 'estoque'),
  modulo('trocas', 'Trocas', 'Devoluções e reposições', 'estoque'),
  modulo('vencimentos', 'Vencimentos', 'Controle de validade e lotes', 'estoque'),
  modulo('temperatura', 'Temperatura', 'Aferição de câmaras e balcões', 'estoque'),
  modulo('usuarios', 'Usuários', 'Colaboradores e credenciais', 'administracao'),
  modulo('permissoes', 'Permissões', 'Matriz de acessos por módulo', 'administracao'),
  modulo('fornecedores', 'Fornecedores', 'Cadastro de parceiros e CNPJs', 'administracao'),
  modulo('categorias', 'Categorias', 'Setores, locais e unidades', 'administracao'),
  modulo('organograma', 'Organograma', 'Estrutura da equipe por setor e superior', 'administracao'),
  modulo('mensagens', 'Mensagens', 'Chat interno entre setores', 'administracao'),
  modulo('notificacoes', 'Notificações', 'Central de avisos e alertas', 'administracao'),
];
