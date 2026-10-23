-- Auditoria de Precificação v2: classe da auditoria, margeamento e correção de preços
-- Rodar no SQL Editor do Supabase. Idempotente.
-- Pré-requisito: tabelas auditorias_precificacao e auditoria_precificacao_itens já existentes.
-- ATENÇÃO: as políticas seguem o padrão atual do projeto (authenticated_total, USING true), que a
-- análise de segurança marca como risco crítico (7.1). Restringir por módulo/perfil quando essa
-- correção for feita para o restante do schema.

alter table public.auditorias_precificacao
  add column if not exists classe varchar;

alter table public.auditoria_precificacao_itens
  add column if not exists preco_margem numeric,
  add column if not exists margem_real_pct numeric,
  add column if not exists margem_meta_pct numeric,
  add column if not exists margem_classificacao varchar,
  add column if not exists correcao_status varchar,
  add column if not exists corrigido_em timestamptz;

create index if not exists auditoria_precificacao_itens_margem_idx
  on public.auditoria_precificacao_itens (margem_classificacao);

-- Margem alvo por departamento / seção / categoria ('' = qualquer valor)
create table if not exists public.auditoria_margem_parametros (
  id uuid not null default gen_random_uuid(),
  departamento varchar not null default '',
  secao varchar not null default '',
  categoria varchar not null default '',
  margem_alvo_pct numeric not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint auditoria_margem_parametros_pkey primary key (id),
  constraint auditoria_margem_parametros_unico unique (departamento, secao, categoria),
  constraint auditoria_margem_parametros_faixa_check check (margem_alvo_pct >= 0 and margem_alvo_pct < 100)
);

-- Faixas de tolerância, em pontos percentuais
create table if not exists public.auditoria_margem_config (
  id varchar not null default 'global',
  faixa_ideal_pp numeric not null default 2,
  faixa_tolerancia_pp numeric not null default 5,
  faixa_muito_pp numeric not null default 10,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint auditoria_margem_config_pkey primary key (id)
);

insert into public.auditoria_margem_config (id) values ('global') on conflict (id) do nothing;

alter table public.auditoria_margem_parametros enable row level security;
alter table public.auditoria_margem_config enable row level security;

drop policy if exists authenticated_total on public.auditoria_margem_parametros;
create policy authenticated_total on public.auditoria_margem_parametros
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_total on public.auditoria_margem_config;
create policy authenticated_total on public.auditoria_margem_config
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.auditoria_margem_parametros to authenticated;
grant select, insert, update, delete on public.auditoria_margem_config to authenticated;
