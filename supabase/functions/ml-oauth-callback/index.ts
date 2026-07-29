// Edge function pública: recebe o "code" do fluxo OAuth do Mercado Livre e troca por tokens
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/ml-oauth-callback`;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const siteOrigin = Deno.env.get("SITE_URL") || "https://criartpersonalizadosdl.lovable.app";

  if (errorParam || !code) {
    return redirect(`${siteOrigin}/admin?ml_error=${encodeURIComponent(errorParam || "sem_code")}`);
  }

  try {
    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Erro ao trocar code por token:", tokenData);
      return redirect(`${siteOrigin}/admin?ml_error=${encodeURIComponent(tokenData?.message || "token_error")}`);
    }

    const expiresAt = new Date(Date.now() + Number(tokenData.expires_in ?? 21600) * 1000);

    // Busca dados do usuário autenticado no ML (nickname, id)
    let nickname: string | null = null;
    try {
      const userRes = await fetch("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        nickname = userData?.nickname ?? null;
      }
    } catch {
      // não bloqueia o fluxo se falhar
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error: upsertErr } = await admin.from("ml_credentials").upsert({
      id: "default",
      ml_user_id: String(tokenData.user_id ?? ""),
      ml_nickname: nickname,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (upsertErr) {
      console.error("Erro ao salvar credenciais ML:", upsertErr);
      return redirect(`${siteOrigin}/admin?ml_error=${encodeURIComponent("erro_ao_salvar")}`);
    }

    return redirect(`${siteOrigin}/admin?ml_connected=1`);
  } catch (e) {
    console.error("Erro no callback ML:", e);
    return redirect(`${siteOrigin}/admin?ml_error=${encodeURIComponent((e as Error).message)}`);
  }
});

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } });
}
