-- Assistente de Precificação (módulo Comercial)
-- Rodar no SQL Editor do Supabase. Idempotente.

create table if not exists public.precificacao_lotes (
  id uuid not null default gen_random_uuid(),
  codigo_customizado varchar not null unique,
  usuario_id uuid not null,
  arquivo_nome varchar,
  periodo_inicio date not null,
  periodo_fim date not null,
  total_itens integer not null default 0,
  total_ajustes_sugeridos integer not null default 0,
  parametros jsonb not null default '{}'::jsonb,
  status varchar not null default 'Importado',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint precificacao_lotes_pkey primary key (id),
  constraint precificacao_lotes_usuario_fkey foreign key (usuario_id) references public.usuarios(id)
);

create table if not exists public.precificacao_itens (
  id uuid not null default gen_random_uuid(),
  lote_id uuid not null,
  produto_id uuid,
  codprod varchar not null,
  descricao varchar not null,
  codbarra varchar,
  unidade varchar,
  embalagem varchar,
  data_alteracao_preco timestamptz,
  custo_atual numeric not null default 0,
  custo_penultimo numeric not null default 0,
  custo_antepenultimo numeric not null default 0,
  preco_venda numeric not null default 0,
  margem_cadastro_pct numeric,
  margem_calculada_pct numeric,
  cod_fornecedor varchar,
  nome_fornecedor varchar,
  data_ultima_entrada date,
  numero_nota varchar,
  dentro_periodo boolean not null default true,
  analisado boolean not null default false,
  variacao_ultimo_pct numeric,
  variacao_penultimo_pct numeric,
  margem_real_pct numeric,
  margem_meta_pct numeric,
  preco_sugerido numeric,
  precisa_ajuste boolean not null default false,
  status varchar not null default 'Pendente',
  alertas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint precificacao_itens_pkey primary key (id),
  constraint precificacao_itens_lote_fkey foreign key (lote_id) references public.precificacao_lotes(id) on delete cascade,
  constraint precificacao_itens_produto_fkey foreign key (produto_id) references public.produtos(id)
);

create index if not exists precificacao_itens_lote_idx on public.precificacao_itens (lote_id);

create table if not exists public.precificacao_ajustes (
  id uuid not null default gen_random_uuid(),
  lote_id uuid not null,
  item_id uuid,
  produto_id uuid not null,
  codprod varchar not null,
  descricao varchar not null,
  preco_anterior numeric not null,
  preco_novo numeric not null,
  custo_considerado numeric not null,
  margem_anterior_pct numeric,
  margem_nova_pct numeric,
  motivo text,
  usuario_id uuid,
  aplicado_em timestamptz not null default timezone('utc'::text, now()),
  constraint precificacao_ajustes_pkey primary key (id),
  constraint precificacao_ajustes_lote_fkey foreign key (lote_id) references public.precificacao_lotes(id) on delete cascade,
  constraint precificacao_ajustes_item_fkey foreign key (item_id) references public.precificacao_itens(id) on delete set null,
  constraint precificacao_ajustes_produto_fkey foreign key (produto_id) references public.produtos(id),
  constraint precificacao_ajustes_usuario_fkey foreign key (usuario_id) references public.usuarios(id)
);

-- RLS no padrão do projeto (authenticated_total)
alter table public.precificacao_lotes enable row level security;
alter table public.precificacao_itens enable row level security;
alter table public.precificacao_ajustes enable row level security;

drop policy if exists authenticated_total on public.precificacao_lotes;
create policy authenticated_total on public.precificacao_lotes
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_total on public.precificacao_itens;
create policy authenticated_total on public.precificacao_itens
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_total on public.precificacao_ajustes;
create policy authenticated_total on public.precificacao_ajustes
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.precificacao_lotes to authenticated;
grant select, insert, update, delete on public.precificacao_itens to authenticated;
grant select, insert, update, delete on public.precificacao_ajustes to authenticated;
