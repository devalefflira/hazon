-- Vencimentos: ciclos de ação (Oferta, Troca, Descarte, Negociação) e histórico completo
-- Rodar no SQL Editor do Supabase (ou psql local). Idempotente.
-- Um ciclo nasce na primeira ação aplicada a um item a vencer (vindo de Vencimentos, Inventário ou
-- Conf. Cega) e fica "Em Curso" até o usuário clicar em "Finalizar Ciclo".
-- ATENÇÃO: as políticas seguem o padrão atual do projeto (authenticated_total, USING true).

create table if not exists public.vencimentos_ciclos (
  id uuid not null default gen_random_uuid(),
  codigo_customizado varchar not null,
  origem varchar not null,                 -- 'Vencimentos' | 'Inventário' | 'Conf. Cega'
  item_origem_id uuid not null,            -- id do registro na tabela de origem
  produto_id uuid not null,
  lote varchar,
  data_validade date not null,
  quantidade numeric not null default 0,
  custo_unitario numeric not null default 0,  -- foto do custo no início do ciclo
  preco_venda numeric not null default 0,     -- foto do preço de venda no início do ciclo
  status varchar not null default 'Em Curso',
  iniciado_por uuid,
  iniciado_em timestamptz not null default timezone('utc'::text, now()),
  finalizado_por uuid,
  finalizado_em timestamptz,
  desfecho varchar,                        -- sequência das ações, ex.: 'Oferta (2x) → Descarte'
  observacao_final text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint vencimentos_ciclos_pkey primary key (id),
  constraint vencimentos_ciclos_codigo_key unique (codigo_customizado),
  constraint vencimentos_ciclos_item_unico unique (origem, item_origem_id),
  constraint vencimentos_ciclos_status_check check (status in ('Em Curso', 'Finalizado')),
  constraint vencimentos_ciclos_produto_fkey foreign key (produto_id) references public.produtos(id),
  constraint vencimentos_ciclos_iniciado_por_fkey foreign key (iniciado_por) references public.usuarios(id),
  constraint vencimentos_ciclos_finalizado_por_fkey foreign key (finalizado_por) references public.usuarios(id)
);

create table if not exists public.vencimentos_acoes (
  id uuid not null default gen_random_uuid(),
  ciclo_id uuid not null,
  tipo varchar not null,                   -- 'Oferta' | 'Troca' | 'Descarte' | 'Negociação'
  quantidade numeric,
  -- Oferta
  preco_custo numeric,
  preco_venda numeric,
  margem_atual_pct numeric,
  preco_oferta numeric,
  margem_oferta_pct numeric,
  validade_oferta date,
  -- Troca / Negociação
  fornecedor_id uuid,
  modalidade_negociacao varchar,           -- 'Rebaixa de Custo' | 'Bonificação em Mercadoria' | 'Verba / Crédito Financeiro'
  novo_custo numeric,
  valor_negociado numeric,
  -- Descarte
  justificativa text,
  observacao text,
  usuario_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint vencimentos_acoes_pkey primary key (id),
  constraint vencimentos_acoes_tipo_check check (tipo in ('Oferta', 'Troca', 'Descarte', 'Negociação')),
  constraint vencimentos_acoes_ciclo_fkey foreign key (ciclo_id) references public.vencimentos_ciclos(id) on delete cascade,
  constraint vencimentos_acoes_fornecedor_fkey foreign key (fornecedor_id) references public.fornecedores(id),
  constraint vencimentos_acoes_usuario_fkey foreign key (usuario_id) references public.usuarios(id)
);

create index if not exists vencimentos_ciclos_status_idx on public.vencimentos_ciclos (status);
create index if not exists vencimentos_ciclos_produto_idx on public.vencimentos_ciclos (produto_id);
create index if not exists vencimentos_acoes_ciclo_idx on public.vencimentos_acoes (ciclo_id, created_at);
create index if not exists vencimentos_acoes_tipo_idx on public.vencimentos_acoes (tipo);

alter table public.vencimentos_ciclos enable row level security;
alter table public.vencimentos_acoes enable row level security;

drop policy if exists authenticated_total on public.vencimentos_ciclos;
create policy authenticated_total on public.vencimentos_ciclos
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_total on public.vencimentos_acoes;
create policy authenticated_total on public.vencimentos_acoes
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.vencimentos_ciclos to authenticated;
grant select, insert, update, delete on public.vencimentos_acoes to authenticated;

-- Recarrega o cache do PostgREST para expor as novas tabelas/relacionamentos
notify pgrst, 'reload schema';
