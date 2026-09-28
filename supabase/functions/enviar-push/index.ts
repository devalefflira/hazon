// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BKa9RyWsImQSklphTacLPfQteVWC6lbGetiZakdJ6PP7m4_yBt-qAX-CFRsrv_KXD1HXSQ5ml3RbgyosHAyMe-E";
const VAPID_PRIVATE_KEY = "iQ-5A6diuBAT4_pAtPOZeNk0wlzF9cxj9eaYIJFwZwU";
const VAPID_SUBJECT = "mailto:admin@hazon.com.br";

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { destinatario_id, titulo, corpo, url } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Busca todas as assinaturas ativas do usuário
    const { data: assinaturas, error } = await supabase
      .from('web_push_subscriptions')
      .select('*')
      .eq('usuario_id', destinatario_id);

    if (error || !assinaturas || assinaturas.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum dispositivo encontrado para este usuário." }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        status: 200,
      });
    }

    const payload = JSON.stringify({
      title: titulo || 'Supermercado Hazon',
      body: corpo || 'Você recebeu uma nova mensagem operacional.',
      url: url || '/'
    });

    const envios = assinaturas.map(async (sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        // Se a assinatura expirou ou o usuário desinstalou, limpa do banco
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('web_push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(envios);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});