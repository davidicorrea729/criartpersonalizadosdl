import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "admin_password";

export const getAdminPassword = () => sessionStorage.getItem(STORAGE_KEY) ?? "";
export const setAdminPassword = (pw: string) => sessionStorage.setItem(STORAGE_KEY, pw);
export const clearAdminPassword = () => sessionStorage.removeItem(STORAGE_KEY);

async function call(action: string, payload: Record<string, unknown> = {}) {
  const password = getAdminPassword();
  const { data, error } = await supabase.functions.invoke("admin-products", {
    body: { action, ...payload },
    headers: { "x-admin-password": password },
  });
  if (error) {
    // Tenta extrair mensagem da resposta da edge function
    const ctx = (error as any).context;
    let serverMsg: string | undefined;
    if (ctx && typeof ctx.json === "function") {
      try {
        const j = await ctx.json();
        serverMsg = j?.error;
      } catch {}
    }
    throw new Error(serverMsg || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const adminApi = {
  verify: (password: string) =>
    supabase.functions
      .invoke("admin-products", {
        body: { action: "verify" },
        headers: { "x-admin-password": password },
      })
      .then(({ data, error }) => {
        if (error) throw new Error("Senha incorreta");
        if (data?.error) throw new Error(data.error);
        return true;
      }),
  list: () => call("list"),
  create: (product: Record<string, unknown>) => call("create", { product }),
  update: (id: string, patch: Record<string, unknown>) => call("update", { id, patch }),
  remove: (id: string) => call("delete", { id }),
  listOrders: () => call("list-orders"),
  updateOrderStatus: (id: string, status: string) =>
    call("update-order-status", { id, status }),
  promoteAdmin: (email: string) => call("promote-admin", { email }),
  uploadImage: async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = r.result as string;
        resolve(s.split(",")[1] ?? "");
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    return call("upload-image", {
      fileName: file.name,
      contentType: file.type,
      base64,
    });
  },
};
