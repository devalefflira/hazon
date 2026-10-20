-- =====================================================================
-- Organograma (Administração > Organograma)
-- Setores e colaboradores com hierarquia (superior_id).
-- =====================================================================

-- 1) Setores (times/áreas da operação)
CREATE TABLE IF NOT EXISTS public.organograma_setores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT organograma_setores_pkey PRIMARY KEY (id),
  CONSTRAINT organograma_setores_nome_key UNIQUE (nome)
);

-- 2) Colaboradores: cada pessoa aponta para quem é o seu superior
CREATE TABLE IF NOT EXISTS public.organograma_colaboradores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  cargo character varying NOT NULL,
  nivel character varying NOT NULL DEFAULT 'Colaborador',
  setor_id uuid,
  superior_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT organograma_colaboradores_pkey PRIMARY KEY (id),
  CONSTRAINT organograma_colaboradores_nivel_check
    CHECK (nivel IN ('Diretoria', 'Gerencia', 'Encarregado', 'Colaborador')),
  CONSTRAINT organograma_colaboradores_setor_fkey
    FOREIGN KEY (setor_id) REFERENCES public.organograma_setores(id) ON DELETE SET NULL,
  CONSTRAINT organograma_colaboradores_superior_fkey
    FOREIGN KEY (superior_id) REFERENCES public.organograma_colaboradores(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_organograma_colaboradores_superior
  ON public.organograma_colaboradores (superior_id);
CREATE INDEX IF NOT EXISTS idx_organograma_colaboradores_setor
  ON public.organograma_colaboradores (setor_id);

-- 3) Impede ciclos na hierarquia (ex.: A subordinado de B e B subordinado de A)
CREATE OR REPLACE FUNCTION public.organograma_impede_ciclo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.superior_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.superior_id = NEW.id THEN
    RAISE EXCEPTION 'Um colaborador não pode ser superior de si mesmo.';
  END IF;

  IF EXISTS (
    WITH RECURSIVE cadeia AS (
      SELECT c.id, c.superior_id
      FROM public.organograma_colaboradores c
      WHERE c.id = NEW.superior_id
      UNION ALL
      SELECT c.id, c.superior_id
      FROM public.organograma_colaboradores c
      JOIN cadeia ON c.id = cadeia.superior_id
    )
    SELECT 1 FROM cadeia WHERE cadeia.id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Movimentação inválida: o superior escolhido está abaixo deste colaborador na hierarquia.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organograma_impede_ciclo ON public.organograma_colaboradores;
CREATE TRIGGER trg_organograma_impede_ciclo
  BEFORE INSERT OR UPDATE OF superior_id ON public.organograma_colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.organograma_impede_ciclo();

-- 4) RLS e acesso: mesmo padrão do S3 (somente usuários autenticados)
ALTER TABLE public.organograma_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organograma_colaboradores ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organograma_setores FROM anon;
REVOKE ALL ON TABLE public.organograma_colaboradores FROM anon;
GRANT ALL ON TABLE public.organograma_setores TO authenticated;
GRANT ALL ON TABLE public.organograma_colaboradores TO authenticated;

DROP POLICY IF EXISTS authenticated_total ON public.organograma_setores;
CREATE POLICY authenticated_total ON public.organograma_setores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS authenticated_total ON public.organograma_colaboradores;
CREATE POLICY authenticated_total ON public.organograma_colaboradores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5) Carga inicial do organograma atual (executa somente se a tabela estiver vazia)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.organograma_colaboradores) THEN
    RAISE NOTICE 'Organograma já possui colaboradores. Carga inicial ignorada.';
  ELSE
    INSERT INTO public.organograma_setores (nome) VALUES
      ('Compras'), ('Escritório'), ('Frente de loja'), ('Caixa'), ('Atacado e balcão'),
      ('Expedição'), ('Loja geral'), ('Piso de loja'), ('Padaria'), ('Açougue'),
      ('Depósito'), ('Limpeza');

    CREATE TEMP TABLE tmp_organograma_seed (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      nome text NOT NULL,
      cargo text NOT NULL,
      nivel text NOT NULL,
      setor text,
      superior text
    ) ON COMMIT DROP;

    INSERT INTO tmp_organograma_seed (nome, cargo, nivel, setor, superior) VALUES
      ('José Carlos', 'Sócio-Representante e CEO', 'Diretoria', NULL, NULL),
      ('Carlos Junio', 'Diretor Administrativo', 'Diretoria', 'Compras', 'José Carlos'),

      ('Áleff Lira', 'Encarregado do escritório', 'Encarregado', 'Escritório', 'Carlos Junio'),
      ('Carlos Henrique', 'Entradas de notas, precificação', 'Colaborador', 'Escritório', 'Áleff Lira'),
      ('Samara Abreu', 'Contas a pagar, despesas e avarias', 'Colaborador', 'Escritório', 'Áleff Lira'),
      ('Ana Karolina', 'Departamento pessoal e RH', 'Colaborador', 'Escritório', 'Áleff Lira'),
      ('Maria Jaciane', 'Caixa geral e contas a pagar', 'Colaborador', 'Escritório', 'Áleff Lira'),
      ('Pablo Antônio', 'Etiquetas, placas, almoxarifado e arquivo', 'Colaborador', 'Escritório', 'Áleff Lira'),

      ('Sidcley Dias', 'Gerente de frente de loja', 'Gerencia', 'Frente de loja', 'José Carlos'),
      ('Samara Vito', 'Crediário, contas a receber e fiscal de caixa', 'Encarregado', 'Caixa', 'Sidcley Dias'),
      ('Elves Sousa', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Jaqueline Gomes', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Jaqueline Araujo', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Kalliny Santos', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Kallyni Silva', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Luziana Silva', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Maisa Carvalho', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Rendo Sousa', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Rosiane Santos', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Samaria Silva', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Samira Sales', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Vanderlene Sousa', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Wanessa Sousa', 'Operador(a) de caixa', 'Colaborador', 'Caixa', 'Samara Vito'),
      ('Jose Dione', 'Conferente de compras e saída', 'Encarregado', 'Expedição', 'Sidcley Dias'),
      ('Lucas Conceição', 'Motorista', 'Colaborador', 'Expedição', 'Jose Dione'),
      ('Rafael Santos', 'Motorista', 'Colaborador', 'Expedição', 'Jose Dione'),
      ('Iza Lohana', 'Vendedora de atacado e balcão', 'Colaborador', 'Atacado e balcão', 'Sidcley Dias'),
      ('Sergio Filho', 'Vendedor de atacado e balcão', 'Colaborador', 'Atacado e balcão', 'Sidcley Dias'),

      ('George Costa', 'Gerente de loja geral', 'Gerencia', 'Loja geral', 'José Carlos'),
      ('João Vitor', 'Encarregado do piso de loja', 'Encarregado', 'Piso de loja', 'George Costa'),
      ('Adriel Santos', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Alex Gonçalves', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Alison Pinho', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Fernando Moura', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Francisco Moura', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Geferson Silva', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Hermeson Silva', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Jo Sousa', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('João Paulo', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Lazaro Pereira', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Ricardo Oliveira', 'Repositor(a)', 'Colaborador', 'Piso de loja', 'João Vitor'),
      ('Maria Gerlane', 'Encarregada de padaria', 'Encarregado', 'Padaria', 'George Costa'),
      ('Ester Silva', 'Auxiliar de padaria', 'Colaborador', 'Padaria', 'Maria Gerlane'),
      ('Felipe Queiroz', 'Auxiliar de padaria', 'Colaborador', 'Padaria', 'Maria Gerlane'),
      ('Joseilton Manoel', 'Encarregado de açougue', 'Encarregado', 'Açougue', 'George Costa'),
      ('Naivan Mendes', 'Açougueiro', 'Colaborador', 'Açougue', 'Joseilton Manoel'),
      ('Jordania Soares', 'Atendente', 'Colaborador', 'Açougue', 'Joseilton Manoel'),
      ('Monica Silva', 'Atendente', 'Colaborador', 'Açougue', 'Joseilton Manoel'),
      ('Pedro Veloso', 'Encarregado de depósito', 'Encarregado', 'Depósito', 'George Costa'),
      ('Antonio Arlis', 'Auxiliar de depósito', 'Colaborador', 'Depósito', 'Pedro Veloso'),
      ('Kalline Lima', 'Auxiliar de limpeza', 'Colaborador', 'Limpeza', 'George Costa'),
      ('Patrícia Santos', 'Auxiliar de limpeza', 'Colaborador', 'Limpeza', 'George Costa');

    INSERT INTO public.organograma_colaboradores (id, nome, cargo, nivel, setor_id)
    SELECT t.id, t.nome, t.cargo, t.nivel, s.id
    FROM tmp_organograma_seed t
    LEFT JOIN public.organograma_setores s ON s.nome = t.setor;

    UPDATE public.organograma_colaboradores c
       SET superior_id = sup.id
      FROM tmp_organograma_seed t
      JOIN tmp_organograma_seed sup ON sup.nome = t.superior
     WHERE c.id = t.id;
  END IF;
END $$;

-- 6) Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
