-- Auditoria de Precificação (módulo Comercial)
-- Rodar no SQL Editor do Supabase. Idempotente.

create table if not exists public.auditorias_precificacao (
  id uuid not null default gen_random_uuid(),
  codigo_customizado varchar not null unique,
  usuario_id uuid not null,
  secao varchar not null,
  secao_outro_descricao varchar,
  status varchar not null default 'Em andamento',
  data_inicio date not null default current_date,
  data_fim date,
  total_itens integer not null default 0,
  total_corretos integer not null default 0,
  total_incorretos integer not null default 0,
  total_sem_preco integer not null default 0,
  observacoes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint auditorias_precificacao_pkey primary key (id),
  constraint auditorias_precificacao_status_check check (status in ('Em andamento', 'Finalizada')),
  constraint auditorias_precificacao_usuario_fkey foreign key (usuario_id) references public.usuarios(id)
);

create table if not exists public.auditoria_precificacao_itens (
  id uuid not null default gen_random_uuid(),
  auditoria_id uuid not null,
  produto_id uuid not null,
  codprod varchar not null,
  descricao varchar not null,
  codbarra varchar,
  departamento varchar,
  secao_produto varchar,
  categoria varchar,
  custo_sistema numeric not null default 0,
  preco_sistema numeric not null default 0,
  situacao varchar not null,
  preco_encontrado numeric,
  observacao text,
  secao_local varchar not null,
  data_auditoria date not null default current_date,
  etiqueta_pendente boolean not null default false,
  etiqueta_impressa_em timestamptz,
  usuario_id uuid not null,
  auditado_em timestamptz not null default timezone('utc'::text, now()),
  constraint auditoria_precificacao_itens_pkey primary key (id),
  constraint auditoria_precificacao_itens_situacao_check check (situacao in ('CORRETO', 'INCORRETO', 'SEM_PRECO')),
  constraint auditoria_precificacao_itens_auditoria_fkey foreign key (auditoria_id) references public.auditorias_precificacao(id) on delete cascade,
  constraint auditoria_precificacao_itens_produto_fkey foreign key (produto_id) references public.produtos(id),
  constraint auditoria_precificacao_itens_usuario_fkey foreign key (usuario_id) references public.usuarios(id),
  constraint auditoria_precificacao_itens_unico_produto unique (auditoria_id, produto_id)
);

create index if not exists auditoria_precificacao_itens_auditoria_idx on public.auditoria_precificacao_itens (auditoria_id);
create index if not exists auditoria_precificacao_itens_etiqueta_idx on public.auditoria_precificacao_itens (etiqueta_pendente) where etiqueta_pendente;
create index if not exists auditoria_precificacao_itens_analise_idx on public.auditoria_precificacao_itens (secao_local, data_auditoria);

-- RLS no padrão do projeto (authenticated_total)
alter table public.auditorias_precificacao enable row level security;
alter table public.auditoria_precificacao_itens enable row level security;

drop policy if exists authenticated_total on public.auditorias_precificacao;
create policy authenticated_total on public.auditorias_precificacao
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_total on public.auditoria_precificacao_itens;
create policy authenticated_total on public.auditoria_precificacao_itens
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.auditorias_precificacao to authenticated;
grant select, insert, update, delete on public.auditoria_precificacao_itens to authenticated;
