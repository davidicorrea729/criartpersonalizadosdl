import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const VALID_CATEGORIES = ["bordados", "impressao3d"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const password = req.headers.get("x-admin-password") ?? "";
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return json({ error: "Senha incorreta" }, 401);
  }

  try {
    const body = req.method === "GET" ? null : await req.json().catch(() => ({}));
    const action = (body as any)?.action ?? new URL(req.url).searchParams.get("action") ?? "list";

    if (action === "verify") {
      return json({ ok: true });
    }

    if (action === "list") {
      const { data, error } = await admin
        .from("products")
        .select("*")
        .order("category")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return json({ products: data });
    }

    if (action === "create") {
      const p = (body as any).product ?? {};
      if (!VALID_CATEGORIES.includes(p.category)) return json({ error: "categoria inválida" }, 400);
      if (!p.name || typeof p.name !== "string") return json({ error: "nome obrigatório" }, 400);
      const { data, error } = await admin
        .from("products")
        .insert({
          category: p.category,
          name: p.name,
          description: p.description ?? "",
          base_price: Number(p.base_price) || 0,
          image_url: p.image_url ?? "",
          sort_order: Number(p.sort_order) || 0,
          is_active: p.is_active ?? true,
          stock: Number(p.stock) || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return json({ product: data });
    }

    if (action === "update") {
      const { id, patch } = body as any;
      if (!id) return json({ error: "id obrigatório" }, 400);
      const allowed: Record<string, unknown> = {};
      for (const k of ["category", "name", "description", "base_price", "image_url", "sort_order", "is_active", "stock"]) {
        if (k in (patch ?? {})) allowed[k] = (patch as any)[k];
      }
      if (allowed.category && !VALID_CATEGORIES.includes(allowed.category as string)) {
        return json({ error: "categoria inválida" }, 400);
      }
      const { data, error } = await admin
        .from("products")
        .update(allowed)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return json({ product: data });
    }

    if (action === "delete") {
      const { id } = body as any;
      if (!id) return json({ error: "id obrigatório" }, 400);
      const { error } = await admin.from("products").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "register-external-sale") {
      const { productId, quantity, channel, note } = body as any;
      const qty = Number(quantity);
      const VALID_CHANNELS = ["shopee", "mercado_livre", "outro"];
      if (!productId) return json({ error: "produto obrigatório" }, 400);
      if (!qty || qty < 1) return json({ error: "quantidade inválida" }, 400);
      const ch = VALID_CHANNELS.includes(channel) ? channel : "outro";

      const { error: mErr } = await admin.from("stock_movements").insert({
        product_id: productId,
        quantity: qty,
        channel: ch,
        note: note ? String(note).slice(0, 280) : "",
      });
      if (mErr) throw mErr;

      const { error: rpcErr } = await admin.rpc("decrement_product_stock", {
        p_product_id: productId,
        p_qty: qty,
      });
      if (rpcErr) throw rpcErr;

      const { data: product, error: pErr } = await admin
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (pErr) throw pErr;
      return json({ product });
    }

    if (action === "upload-image") {
      // body: { fileName, contentType, base64 }
      const { fileName, contentType, base64 } = body as any;
      if (!fileName || !base64) return json({ error: "arquivo inválido" }, 400);
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const path = `uploads/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await admin.storage
        .from("product-images")
        .upload(path, bytes, { contentType: contentType || "image/jpeg", upsert: false });
      if (error) throw error;
      const { data: pub } = admin.storage.from("product-images").getPublicUrl(path);
      return json({ url: pub.publicUrl });
    }

    if (action === "list-orders") {
      const { data, error } = await admin
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ orders: data });
    }

    if (action === "update-order-status") {
      const { id, status } = body as any;
      const VALID = ["pendente", "em_producao", "enviado", "concluido", "cancelado"];
      if (!id || !VALID.includes(status)) return json({ error: "dados inválidos" }, 400);
      const { data, error } = await admin
        .from("orders")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return json({ order: data });
    }

    if (action === "dashboard") {
      const period = ((body as any)?.period ?? "all") as "today" | "7d" | "30d" | "all";
      let since: string | null = null;
      const now = new Date();
      if (period === "today") {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (period === "7d") {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (period === "30d") {
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      let ordersQuery = admin
        .from("orders")
        .select("id, status, total, payment_status, pix_expires_at, created_at, order_items(product_id, quantity, unit_price)");
      if (since) ordersQuery = ordersQuery.gte("created_at", since);
      const { data: orders, error: ordersErr } = await ordersQuery;
      if (ordersErr) throw ordersErr;

      const { data: products, error: productsErr } = await admin
        .from("products")
        .select("id, name, category, base_price, stock, is_active")
        .order("category")
        .order("sort_order");
      if (productsErr) throw productsErr;

      let movementsQuery = admin
        .from("stock_movements")
        .select("quantity, channel, created_at");
      if (since) movementsQuery = movementsQuery.gte("created_at", since);
      const { data: movements, error: movementsErr } = await movementsQuery;
      if (movementsErr) throw movementsErr;

      const externalSales = { shopee: 0, mercado_livre: 0, outro: 0 };
      for (const m of movements ?? []) {
        const ch = (m.channel as string) in externalSales ? (m.channel as keyof typeof externalSales) : "outro";
        externalSales[ch] += Number(m.quantity) || 0;
      }

      const revenue = { recebido: 0, pendente: 0, cancelado: 0 };
      const ordersByStatus: Record<string, number> = {
        pendente: 0,
        em_producao: 0,
        enviado: 0,
        concluido: 0,
        cancelado: 0,
      };
      const soldByProduct = new Map<string, { qty: number; revenue: number }>();
      let expiredPending = 0;
      const now2 = Date.now();

      for (const o of orders ?? []) {
        const total = Number(o.total) || 0;
        if (o.payment_status === "approved") revenue.recebido += total;
        else if (o.payment_status === "rejected" || o.payment_status === "cancelled") revenue.cancelado += total;
        else revenue.pendente += total;

        if (o.status in ordersByStatus) ordersByStatus[o.status] += 1;

        if (
          o.status === "pendente" &&
          o.payment_status !== "approved" &&
          o.pix_expires_at &&
          new Date(o.pix_expires_at).getTime() < now2
        ) {
          expiredPending += 1;
        }

        if (o.payment_status === "approved") {
          for (const it of (o as any).order_items ?? []) {
            if (!it.product_id) continue;
            const cur = soldByProduct.get(it.product_id) ?? { qty: 0, revenue: 0 };
            cur.qty += Number(it.quantity) || 0;
            cur.revenue += (Number(it.unit_price) || 0) * (Number(it.quantity) || 0);
            soldByProduct.set(it.product_id, cur);
          }
        }
      }

      const productsWithSales = (products ?? []).map((p: any) => ({
        ...p,
        sold_qty: soldByProduct.get(p.id)?.qty ?? 0,
        sold_revenue: soldByProduct.get(p.id)?.revenue ?? 0,
      }));

      return json({
        period,
        revenue,
        ordersByStatus,
        expiredPending,
        totalOrders: (orders ?? []).length,
        products: productsWithSales,
        externalSales,
      });
    }

    if (action === "promote-admin") {
      const { email } = body as any;
      if (!email) return json({ error: "email obrigatório" }, 400);
      const { data: list, error: lerr } = await admin.auth.admin.listUsers();
      if (lerr) throw lerr;
      const user = list.users.find((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (!user) return json({ error: "usuário não encontrado. Cadastre-se primeiro com este email." }, 404);
      const { error: rerr } = await admin
        .from("user_roles")
        .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
      if (rerr) throw rerr;
      return json({ ok: true });
    }

    return json({ error: "ação desconhecida" }, 400);
  } catch (err) {
    console.error("admin-products error:", err);
    return json({ error: err instanceof Error ? err.message : "erro interno" }, 500);
  }
});
