import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  adminApi,
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
} from "@/lib/adminApi";
import { formatBRL } from "@/store/cart";
import { STATUS_LABEL, STATUS_COLOR, type Order, type OrderStatus } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Trash2, Plus, Upload, LogOut, Lock, ShieldPlus } from "lucide-react";
import { toast } from "sonner";

interface ProductRow {
  id: string;
  category: "bordados" | "impressao3d";
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const empty: Omit<ProductRow, "id"> = {
  category: "bordados",
  name: "",
  description: "",
  base_price: 0,
  image_url: "",
  sort_order: 0,
  is_active: true,
};

const Admin = () => {
  const { user } = useAuth();
  const [authed, setAuthed] = useState(false);
  const [password, setPwInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<Omit<ProductRow, "id">>(empty);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"products" | "orders">("products");

  useEffect(() => {
    const saved = getAdminPassword();
    if (saved) {
      adminApi
        .verify(saved)
        .then(() => {
          setAuthed(true);
          loadAll();
        })
        .catch(() => clearAdminPassword());
    }
  }, []);

  const loadAll = async () => {
    try {
      const [{ products }, { orders }] = await Promise.all([
        adminApi.list(),
        adminApi.listOrders(),
      ]);
      setItems(products ?? []);
      setOrders(orders ?? []);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    try {
      await adminApi.verify(password);
      setAdminPassword(password);
      setAuthed(true);
      // Promove o usuário logado a admin para que ele consiga acessar via app
      if (user?.email) {
        try {
          await adminApi.promoteAdmin(user.email);
        } catch {}
      }
      await loadAll();
      toast.success("Bem-vindo!");
    } catch (e: any) {
      toast.error(e.message || "Senha incorreta");
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    const { id, ...rest } = p;
    setForm(rest);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    setLoading(true);
    try {
      if (editing) {
        await adminApi.update(editing.id, form);
        toast.success("Produto atualizado");
      } else {
        await adminApi.create(form);
        toast.success("Produto criado");
      }
      setOpen(false);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (p: ProductRow) => {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    try {
      await adminApi.remove(p.id);
      toast.success("Excluído");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const { url } = await adminApi.uploadImage(f);
      setForm((s) => ({ ...s, image_url: url }));
      toast.success("Imagem enviada");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    clearAdminPassword();
    setAuthed(false);
    setPwInput("");
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await adminApi.updateOrderStatus(orderId, status);
      toast.success("Status atualizado");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!authed) {
    return (
      <AppShell title="Admin" showBack>
        <div className="px-5 py-10 max-w-sm mx-auto">
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold">Painel do criador</h2>
            <p className="text-sm text-muted-foreground text-center">
              Digite a senha para gerenciar produtos e pedidos
            </p>
          </div>
          <div className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Senha de admin"
              autoFocus
            />
            <Button
              onClick={handleLogin}
              disabled={loading || !password}
              variant="hero"
              size="lg"
              className="w-full"
            >
              {loading ? "Verificando..." : "Entrar"}
            </Button>
            {!user && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Dica: faça login na sua conta antes para se tornar admin automaticamente.
              </p>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin" showBack>
      <div className="px-4 pt-3 pb-32">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {tab === "products" ? `${items.length} produto(s)` : `${orders.length} pedido(s)`}
          </p>
          <button
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
          >
            <LogOut className="h-3 w-3" /> Sair
          </button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full mb-3">
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl shadow-soft p-3 flex gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-16 w-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.category === "bordados" ? "Bordados" : "Impressão 3D"}
                    {!p.is_active && " • inativo"}
                  </p>
                  <p className="text-sm font-bold text-primary mt-0.5">
                    {formatBRL(Number(p.base_price))}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(p)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent" aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground" aria-label="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                Nenhum produto. Clique em + para criar o primeiro.
              </p>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-card rounded-2xl shadow-soft p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{o.customer_name || "Cliente"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      #{o.id.slice(0, 8).toUpperCase()} • {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{o.customer_phone}</p>
                  </div>
                  <Badge className={STATUS_COLOR[o.status]} variant="secondary">
                    {STATUS_LABEL[o.status]}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2 space-y-0.5">
                  {o.order_items?.map((it) => (
                    <div key={it.id} className="flex justify-between gap-2">
                      <span className="truncate">{it.quantity}× {it.name}</span>
                      <span>{formatBRL(Number(it.unit_price) * it.quantity)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{o.shipping_address}</p>
                <div className="flex items-center justify-between gap-2 mt-3 border-t pt-2">
                  <span className="font-bold text-primary">{formatBRL(Number(o.total))}</span>
                  <Select
                    value={o.status}
                    onValueChange={(v) => handleStatusChange(o.id, v as OrderStatus)}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                Nenhum pedido ainda.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {tab === "products" && (
        <button
          onClick={openNew}
          className="fixed bottom-20 right-4 md:bottom-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-elegant flex items-center justify-center z-30 hover:scale-105 transition-smooth"
          aria-label="Novo produto"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v: any) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bordados">Bordados</SelectItem>
                  <SelectItem value="impressao3d">Impressão 3D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço base (R$)</Label>
                <Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) || 0 })} className="mt-1" />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Imagem</Label>
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-32 w-full object-cover rounded-xl" />}
              <label className="mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-3 cursor-pointer hover:border-primary text-sm">
                <Upload className="h-4 w-4" />
                {uploading ? "Enviando..." : form.image_url ? "Trocar imagem" : "Enviar imagem"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="ou cole uma URL" className="mt-2 text-xs" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Ativo no catálogo</Label>
              <Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading} variant="hero">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Admin;
