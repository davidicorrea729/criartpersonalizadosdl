// Edge function pública: recebe notificação do Mercado Pago e atualiza payment_status
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id",
};

const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({} as any));

    // MP envia tanto via query (?type=payment&data.id=...) quanto via body
    const type =
      url.searchParams.get("type") ||
      url.searchParams.get("topic") ||
      body?.type ||
      body?.topic;
    const paymentId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      body?.data?.id ||
      body?.resource?.toString().split("/").pop();

    console.log("Webhook recebido:", { type, paymentId });

    if (type !== "payment" || !paymentId) {
      return new Response("ignored", { status: 200, headers: corsHeaders });
    }

    // Busca pagamento autoritativamente no MP
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${MP_TOKEN}` } },
    );
    if (!mpRes.ok) {
      const t = await mpRes.text();
      console.error("Falha consultar MP:", mpRes.status, t);
      return new Response("error", { status: 200, headers: corsHeaders });
    }
    const payment = await mpRes.json();
    const status = payment?.status as string; // approved, pending, rejected, cancelled, in_process, refunded, charged_back
    const orderId = payment?.external_reference as string;

    if (!orderId) {
      console.warn("Pagamento sem external_reference:", paymentId);
      return new Response("no order", { status: 200, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Busca o status atual antes de atualizar, para só descontar estoque uma vez
    const { data: currentOrder } = await admin
      .from("orders")
      .select("payment_status, order_items(product_id, quantity)")
      .eq("id", orderId)
      .maybeSingle();
    const wasAlreadyApproved = currentOrder?.payment_status === "approved";

    const updates: Record<string, unknown> = {
      payment_status: status,
      mp_payment_id: String(paymentId),
    };

    // Se aprovado, avança o status do pedido para "em_producao" automaticamente
    if (status === "approved") {
      updates.status = "em_producao";
    } else if (status === "cancelled" || status === "rejected") {
      updates.status = "cancelado";
    }

    const { error } = await admin
      .from("orders")
      .update(updates)
      .eq("id", orderId);
    if (error) {
      console.error("Erro update order:", error);
      return new Response("db error", { status: 200, headers: corsHeaders });
    }

    // Desconta estoque uma única vez, na primeira aprovação
    if (status === "approved" && !wasAlreadyApproved) {
      const items = (currentOrder?.order_items ?? []) as { product_id: string | null; quantity: number }[];
      for (const it of items) {
        if (!it.product_id) continue;
        const { error: stockErr } = await admin.rpc("decrement_product_stock", {
          p_product_id: it.product_id,
          p_qty: it.quantity,
        });
        if (stockErr) console.error("Erro ao descontar estoque:", stockErr);
      }
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("Webhook erro:", e);
    // Sempre 200 para o MP não ficar reenviando indefinidamente em erros nossos
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
