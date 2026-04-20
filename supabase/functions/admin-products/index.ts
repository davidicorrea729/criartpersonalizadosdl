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
      for (const k of ["category", "name", "description", "base_price", "image_url", "sort_order", "is_active"]) {
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
