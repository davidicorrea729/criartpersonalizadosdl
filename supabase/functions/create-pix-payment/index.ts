// Edge function: cria pagamento PIX no Mercado Pago e salva QR Code no pedido
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Não autenticado" }, 401);
    }
    const userId = claimsData.claims.sub as string;
    const email = (claimsData.claims.email as string) || "comprador@example.com";

    const body = await req.json().catch(() => ({}));
    const orderId = body?.orderId as string | undefined;
    if (!orderId) return json({ error: "orderId obrigatório" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: order, error: oErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (oErr || !order) return json({ error: "Pedido não encontrado" }, 404);
    if (order.user_id !== userId)
      return json({ error: "Sem permissão" }, 403);

    // Se PIX já gerado e ainda válido, retorna existente
    if (
      order.pix_qr_code &&
      order.pix_expires_at &&
      new Date(order.pix_expires_at) > new Date() &&
      order.payment_status === "pending"
    ) {
      return json({
        qr_code: order.pix_qr_code,
        qr_code_base64: order.pix_qr_code_base64,
        expires_at: order.pix_expires_at,
        mp_payment_id: order.mp_payment_id,
      });
    }

    // Nome do cliente: aceita "Fulano Silva" ou só "Fulano"
    const fullName = (order.customer_name || "Cliente").trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(" ") || "Cliente";

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Webhook público
    const notificationUrl = `${SUPABASE_URL}/functions/v1/mp-webhook`;

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_TOKEN}`,
        "X-Idempotency-Key": `${orderId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: Number(order.total),
        description: `Pedido #${String(orderId).slice(0, 8).toUpperCase()}`,
        payment_method_id: "pix",
        date_of_expiration: expiresAt.toISOString().replace("Z", "-00:00"),
        notification_url: notificationUrl,
        external_reference: orderId,
        payer: {
          email,
          first_name: firstName,
          last_name: lastName,
        },
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("Erro MP:", mpData);
      return json(
        { error: mpData?.message || "Erro ao gerar PIX", details: mpData },
        500,
      );
    }

    const qrCode =
      mpData?.point_of_interaction?.transaction_data?.qr_code || null;
    const qrCodeBase64 =
      mpData?.point_of_interaction?.transaction_data?.qr_code_base64 || null;

    if (!qrCode) {
      return json({ error: "QR Code não retornado pelo Mercado Pago" }, 500);
    }

    const { error: uErr } = await admin
      .from("orders")
      .update({
        mp_payment_id: String(mpData.id),
        pix_qr_code: qrCode,
        pix_qr_code_base64: qrCodeBase64,
        pix_expires_at: expiresAt.toISOString(),
        payment_status: "pending",
      })
      .eq("id", orderId);
    if (uErr) return json({ error: uErr.message }, 500);

    return json({
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      expires_at: expiresAt.toISOString(),
      mp_payment_id: String(mpData.id),
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
