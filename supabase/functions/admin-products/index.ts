import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";
const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID") ?? "";
const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET") ?? "";
const ML_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/ml-oauth-callback`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const VALID_CATEGORIES = ["bordados", "impressao3d"];

// Retorna um access_token válido do Mercado Livre, renovando via refresh_token se necessário
async function getValidMlToken(): Promise<{ accessToken: string } | { error: string }> {
  const { data: cred, error } = await admin
    .from("ml_credentials")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!cred) return { error: "Mercado Livre não conectado" };

  if (new Date(cred.expires_at).getTime() > Date.now() + 60_000) {
    return { accessToken: cred.access_token };
  }

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: cred.refresh_token,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data?.message || "Erro ao renovar token do Mercado Livre" };

  const expiresAt = new Date(Date.now() + Number(data.expires_in ?? 21600) * 1000);
  await admin
    .from("ml_credentials")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");

  return { accessToken: data.access_token };
}

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

    if (action === "ml-auth-url") {
      if (!ML_CLIENT_ID) return json({ error: "ML_CLIENT_ID não configurado" }, 400);
      const authUrl = new URL("https://auth.mercadolivre.com.br/authorization");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", ML_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", ML_REDIRECT_URI);
      return json({ url: authUrl.toString() });
    }

    if (action === "ml-status") {
      const { data: cred } = await admin
        .from("ml_credentials")
        .select("ml_nickname, ml_user_id, updated_at")
        .eq("id", "default")
        .maybeSingle();
      return json({ connected: !!cred, nickname: cred?.ml_nickname ?? null });
    }

    if (action === "ml-disconnect") {
      const { error: delErr } = await admin.from("ml_credentials").delete().eq("id", "default");
      if (delErr) throw delErr;
      return json({ ok: true });
    }

    if (action === "ml-search-categories") {
      const { query } = body as any;
      if (!query) return json({ error: "busca obrigatória" }, 400);
      const catRes = await fetch(
        `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(query)}`,
      );
      const catData = await catRes.json();
      if (!catRes.ok || !Array.isArray(catData)) {
        return json({ error: "Erro ao buscar categorias no Mercado Livre" }, 500);
      }
      return json({
        categories: catData.map((c: any) => ({
          category_id: c.category_id,
          category_name: c.category_name,
          domain_name: c.domain_name,
        })),
      });
    }

    if (action === "ml-publish") {
      const { productId, categoryId: chosenCategoryId, categoryName: chosenCategoryName } = body as any;
      if (!productId) return json({ error: "produto obrigatório" }, 400);

      const tokenResult = await getValidMlToken();
      if ("error" in tokenResult) return json({ error: tokenResult.error }, 400);
      const { accessToken } = tokenResult;

      const { data: product, error: pErr } = await admin
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (pErr || !product) return json({ error: "Produto não encontrado" }, 404);
      if (!product.stock || product.stock < 1) {
        return json({ error: "Defina um estoque de pelo menos 1 unidade antes de publicar" }, 400);
      }

      const mlHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const describeMlError = (data: any, fallback: string) => {
        const causes = Array.isArray(data?.cause)
          ? data.cause.map((c: any) => c.message).filter(Boolean).join("; ")
          : "";
        return causes || data?.message || fallback;
      };

      // Atualização de anúncio já existente: só preço e estoque
      if (product.ml_item_id) {
        const updRes = await fetch(`https://api.mercadolibre.com/items/${product.ml_item_id}`, {
          method: "PUT",
          headers: mlHeaders,
          body: JSON.stringify({
            price: Number(product.base_price),
            available_quantity: Number(product.stock),
          }),
        });
        const updData = await updRes.json();
        if (!updRes.ok) {
          console.error("Erro ao atualizar anúncio ML:", updData);
          return json({ error: describeMlError(updData, "Erro ao atualizar no Mercado Livre"), details: updData }, 500);
        }
        await admin
          .from("products")
          .update({ ml_synced_at: new Date().toISOString() })
          .eq("id", productId);
        return json({ ok: true, updated: true, permalink: product.ml_permalink });
      }

      // Categoria: usa a escolhida manualmente agora, ou a já salva, ou tenta prever
      const categoryId = chosenCategoryId || product.ml_category_id;
      if (!categoryId) {
        return json({ error: "Escolha uma categoria do Mercado Livre antes de publicar" }, 400);
      }

      // Descobre um tipo de anúncio válido para essa categoria/conta
      let listingTypeId = "gold_special";
      try {
        const meRes = await fetch("https://api.mercadolibre.com/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const me = await meRes.json();
        const ltRes = await fetch(
          `https://api.mercadolibre.com/users/${me.id}/available_listing_types?category_id=${categoryId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const ltData = await ltRes.json();
        if (ltRes.ok && Array.isArray(ltData?.listing_type_id_options) && ltData.listing_type_id_options.length) {
          listingTypeId = ltData.listing_type_id_options[0];
        }
      } catch {
        // mantém o padrão se essa checagem falhar
      }

      const itemPayload: Record<string, unknown> = {
        title: String(product.name).slice(0, 60),
        category_id: categoryId,
        price: Number(product.base_price),
        currency_id: "BRL",
        available_quantity: Number(product.stock),
        condition: "new",
        listing_type_id: listingTypeId,
        buying_mode: "buy_it_now",
        // Algumas categorias (com atributos "catalog_required" como marca/modelo) exigem
        // esse campo para agrupar o anúncio numa família de produto no catálogo do ML.
        family_name: String(product.name).slice(0, 60),
      };
      if (product.image_url) {
        itemPayload.pictures = [{ source: product.image_url }];
      }

      const createRes = await fetch("https://api.mercadolibre.com/items", {
        method: "POST",
        headers: mlHeaders,
        body: JSON.stringify(itemPayload),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        console.error("Erro ao criar anúncio ML:", { categoryId, createData });
        return json({ error: describeMlError(createData, "Erro ao publicar no Mercado Livre"), details: createData }, 500);
      }

      // Descrição em endpoint separado (não bloqueia se falhar)
      if (product.description) {
        try {
          await fetch(`https://api.mercadolibre.com/items/${createData.id}/description`, {
            method: "POST",
            headers: mlHeaders,
            body: JSON.stringify({ plain_text: String(product.description).slice(0, 5000) }),
          });
        } catch {
          // não bloqueia a publicação
        }
      }

      await admin
        .from("products")
        .update({
          ml_item_id: createData.id,
          ml_permalink: createData.permalink,
          ml_synced_at: new Date().toISOString(),
          ml_category_id: categoryId,
          ml_category_name: chosenCategoryName || product.ml_category_name || null,
        })
        .eq("id", productId);

      return json({ ok: true, item_id: createData.id, permalink: createData.permalink });
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
