-- Escopo da coleta de inventário (Departamento / Seção / Categoria)
-- Departamento e Seção são obrigatórios na aplicação; Categoria é opcional (NULL = todas).

ALTER TABLE public.inventarios
  ADD COLUMN IF NOT EXISTS departamento character varying,
  ADD COLUMN IF NOT EXISTS secao character varying,
  ADD COLUMN IF NOT EXISTS categoria character varying;
