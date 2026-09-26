export type TipoMensagem = 'Solicitação' | 'Sugestão' | 'Relatar Bug' | 'Outros';
export type SubtipoSol = 'Cadastrar Produto' | 'Fazer Oferta' | 'Gerar Relatório' | 'Outras Solicitações';

export interface AnexoMensagem {
  tipo: 'foto' | 'documento';
  nome: string;
  url: string; // Base64 Data URL
}

export interface MensagemView {
  id: string;
  codigo_customizado: string;
  remetente_id: string;
  remetente_nome?: string;
  destinatario_id: string;
  destinatario_nome?: string;
  tipo_mensagem: TipoMensagem;
  subtipo_solicitacao?: SubtipoSol;
  conteudo: string;
  status: 'Pendente' | 'Resolvido';
  resposta_conteudo?: string;
  respondido_em?: string;
  anexos: AnexoMensagem[];
  created_at: string;
}

export interface EnviarMensagemPayload {
  remetente_id: string;
  destinatario_id: string;
  tipo_mensagem: TipoMensagem;
  subtipo_solicitacao?: SubtipoSol;
  conteudo: string;
  anexos: AnexoMensagem[];
}