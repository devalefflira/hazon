// supabase/functions/criar-usuario/index.ts
// Gerencia o acesso de usuários do Hazon ERP no Supabase Auth.
// Ações:
//  - "criar":          cria a conta no Auth e a linha em public.usuarios com o MESMO id.
//  - "atualizar_acesso": altera e-mail e/ou senha da conta no Auth.
// Somente usuários com perfil "Administrador" podem chamar esta função.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PERFIL_ADMIN = "Administrador";
const TAMANHO_MINIMO_SENHA = 6;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// O join com perfis pode vir como objeto ou array, dependendo do PostgREST.
function nomePerfil(valor: any): string | undefined {
  if (!valor) return undefined;
  if (Array.isArray(valor)) return valor[0]?.nome;
  return valor.nome;
}

async function criarUsuario(admin: any, body: any): Promise<Response> {
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim();
  const senha = String(body.senha ?? "");
  const setor = String(body.setor ?? "").trim();
  const perfilId = String(body.perfil_id ?? "");

  if (!nome || !email || !setor || !perfilId) {
    return json({ error: "Preencha nome, e-mail, setor e perfil." }, 400);
  }
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return json({ error: `A senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres.` }, 400);
  }

  // 1. Cria a conta de acesso no Supabase Auth
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (erroAuth || !criado?.user) {
    return json({ error: erroAuth?.message ?? "Não foi possível criar a conta de acesso." }, 400);
  }

  // 2. Cria o cadastro no sistema usando o MESMO id do Auth (é assim que o login encontra o usuário)
  const { data: linha, error: erroInsert } = await admin
    .from("usuarios")
    .insert({
      id: criado.user.id,
      nome,
      email,
      setor,
      perfil_id: perfilId,
    })
    .select("id, nome, email, setor, perfil_id, updated_at")
    .single();

  if (erroInsert) {
    // Desfaz a conta no Auth para não deixar acesso órfão
    await admin.auth.admin.deleteUser(criado.user.id);
    return json({ error: erroInsert.message }, 400);
  }

  return json({ usuario: linha });
}

async function atualizarAcesso(admin: any, body: any): Promise<Response> {
  const usuarioId = String(body.usuario_id ?? "");
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const senha = typeof body.senha === "string" ? body.senha : "";

  if (!usuarioId) {
    return json({ error: "Usuário não informado." }, 400);
  }

  const atributos: { email?: string; password?: string } = {};
  if (email) atributos.email = email;
  if (senha) {
    if (senha.length < TAMANHO_MINIMO_SENHA) {
      return json({ error: `A senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres.` }, 400);
    }
    atributos.password = senha;
  }

  if (Object.keys(atributos).length === 0) {
    return json({ ok: true });
  }

  const { error } = await admin.auth.admin.updateUserById(usuarioId, atributos);
  if (error) {
    return json(
      {
        error:
          `Não foi possível atualizar o acesso: ${error.message}. ` +
          "Se a conta foi criada antes desta correção, recadastre o usuário.",
      },
      400,
    );
  }

  return json({ ok: true });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Quem chama precisa estar logado...
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) {
      return json({ error: "Não autenticado." }, 401);
    }

    const { data: sessao, error: erroSessao } = await admin.auth.getUser(token);
    if (erroSessao || !sessao?.user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    // 2. ...e ser Administrador
    const { data: chamador } = await admin
      .from("usuarios")
      .select("id, perfis ( nome )")
      .eq("id", sessao.user.id)
      .maybeSingle();

    if (!chamador || nomePerfil(chamador.perfis) !== PERFIL_ADMIN) {
      return json({ error: "Apenas administradores podem gerenciar usuários." }, 403);
    }

    const body = await req.json();
    const acao = body?.acao ?? "criar";

    if (acao === "criar") return await criarUsuario(admin, body);
    if (acao === "atualizar_acesso") return await atualizarAcesso(admin, body);

    return json({ error: "Ação inválida." }, 400);
  } catch (err: any) {
    return json({ error: err?.message ?? "Erro inesperado." }, 500);
  }
});
