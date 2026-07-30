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
import { Progress } from "@/components/ui/progress";
import {
  adminApi,
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
} from "@/lib/adminApi";
import { formatBRL } from "@/store/cart";
import { STATUS_LABEL, STATUS_COLOR, isPixExpired, pixProgress, type Order, type OrderStatus } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Trash2, Plus, Upload, LogOut, Lock, ShieldPlus, Search, Wallet, Clock, XCircle, PackageSearch, Store, ShoppingBag, ExternalLink, Link2, Link2Off } from "lucide-react";
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
  stock: number;
  ml_item_id: string | null;
  ml_permalink: string | null;
  ml_category_id: string | null;
  ml_category_name: string | null;
}

interface MlCategoryOption {
  category_id: string;
  category_name: string;
  domain_name: string;
}

interface DashboardProduct {
  id: string;
  name: string;
  category: "bordados" | "impressao3d";
  base_price: number;
  stock: number;
  is_active: boolean;
  sold_qty: number;
  sold_revenue: number;
}

interface DashboardData {
  period: "today" | "7d" | "30d" | "all";
  revenue: { recebido: number; pendente: number; cancelado: number };
  ordersByStatus: Record<string, number>;
  expiredPending: number;
  totalOrders: number;
  products: DashboardProduct[];
  externalSales: { shopee: number; mercado_livre: number; outro: number };
}

const CHANNEL_LABEL: Record<string, string> = {
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  outro: "Outro canal",
};

const empty: Omit<ProductRow, "id"> = {
  category: "bordados",
  name: "",
  description: "",
  base_price: 0,
  image_url: "",
  sort_order: 0,
  is_active: true,
  stock: 0,
  ml_item_id: null,
  ml_permalink: null,
  ml_category_id: null,
  ml_category_name: null,
};

const formatTimeLeft = (pixExpiresAt: string | null, now: number) => {
  if (!pixExpiresAt) return "";
  const ms = new Date(pixExpiresAt).getTime() - now;
  if (ms <= 0) return "expirado";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `expira em ${h}h${String(m).padStart(2, "0")}` : `expira em ${m}min`;
};

const PERIOD_LABEL: Record<DashboardData["period"], string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  all: "Tudo",
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
  const [tab, setTab] = useState<"dashboard" | "products" | "orders">("dashboard");
  const [search, setSearch] = useState("");
  const [dashPeriod, setDashPeriod] = useState<DashboardData["period"]>("all");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [externalSaleFor, setExternalSaleFor] = useState<ProductRow | null>(null);
  const [externalSaleForm, setExternalSaleForm] = useState({ quantity: 1, channel: "shopee", note: "" });
  const [registeringSale, setRegisteringSale] = useState(false);
  const [mlConnected, setMlConnected] = useState<boolean | null>(null);
  const [mlNickname, setMlNickname] = useState<string | null>(null);
  const [mlConnecting, setMlConnecting] = useState(false);
  const [mlPublishingId, setMlPublishingId] = useState<string | null>(null);
  const [mlPublishFor, setMlPublishFor] = useState<ProductRow | null>(null);
  const [mlCategoryQuery, setMlCategoryQuery] = useState("");
  const [mlCategoryOptions, setMlCategoryOptions] = useState<MlCategoryOption[]>([]);
  const [mlCategorySearching, setMlCategorySearching] = useState(false);
  const [mlSelectedCategory, setMlSelectedCategory] = useState<MlCategoryOption | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const loadMlStatus = async () => {
    try {
      const data = await adminApi.mlStatus();
      setMlConnected(data.connected);
      setMlNickname(data.nickname);
    } catch {
      setMlConnected(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    loadMlStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("ml_connected")) {
      toast.success("Mercado Livre conectado!");
      window.history.replaceState({}, "", window.location.pathname);
      loadMlStatus();
    } else if (params.get("ml_error")) {
      toast.error(`Erro ao conectar Mercado Livre: ${params.get("ml_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleMlConnect = async () => {
    setMlConnecting(true);
    try {
      const { url } = await adminApi.mlAuthUrl();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message);
      setMlConnecting(false);
    }
  };

  const handleMlDisconnect = async () => {
    if (!confirm("Desconectar o Mercado Livre? Anúncios já publicados continuam ativos, mas pararão de atualizar automaticamente.")) return;
    try {
      await adminApi.mlDisconnect();
      setMlConnected(false);
      setMlNickname(null);
      toast.success("Desconectado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMlPublish = async (p: ProductRow, categoryId?: string, categoryName?: string) => {
    setMlPublishingId(p.id);
    try {
      await adminApi.mlPublish(p.id, categoryId, categoryName);
      toast.success(p.ml_item_id ? "Anúncio atualizado no Mercado Livre!" : "Publicado no Mercado Livre!");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMlPublishingId(null);
    }
  };

  const openMlPublish = (p: ProductRow) => {
    if (!mlConnected) return toast.info("Conecte o Mercado Livre primeiro");
    // Já publicado (ou categoria já escolhida antes): só atualiza preço/estoque direto
    if (p.ml_item_id) return handleMlPublish(p);
    setMlPublishFor(p);
    setMlCategoryQuery(p.name);
    setMlCategoryOptions([]);
    setMlSelectedCategory(
      p.ml_category_id ? { category_id: p.ml_category_id, category_name: p.ml_category_name ?? p.ml_category_id, domain_name: "" } : null,
    );
    searchMlCategories(p.name);
  };

  const searchMlCategories = async (query: string) => {
    if (!query.trim()) return;
    setMlCategorySearching(true);
    try {
      const data = await adminApi.mlSearchCategories(query.trim());
      setMlCategoryOptions(data.categories ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMlCategorySearching(false);
    }
  };

  const confirmMlPublish = async () => {
    if (!mlPublishFor || !mlSelectedCategory) return;
    await handleMlPublish(mlPublishFor, mlSelectedCategory.category_id, mlSelectedCategory.category_name);
    setMlPublishFor(null);
  };

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

  const loadDashboard = async (period: DashboardData["period"]) => {
    setDashLoading(true);
    try {
      const data = await adminApi.dashboard(period);
      setDashboard(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (authed && tab === "dashboard") loadDashboard(dashPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab, dashPeriod]);

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

  const openExternalSale = (p: ProductRow) => {
    setExternalSaleFor(p);
    setExternalSaleForm({ quantity: 1, channel: "shopee", note: "" });
  };

  const handleRegisterExternalSale = async () => {
    if (!externalSaleFor) return;
    if (externalSaleForm.quantity < 1) return toast.error("Quantidade inválida");
    setRegisteringSale(true);
    try {
      await adminApi.registerExternalSale(
        externalSaleFor.id,
        externalSaleForm.quantity,
        externalSaleForm.channel,
        externalSaleForm.note,
      );
      toast.success("Estoque atualizado!");
      setExternalSaleFor(null);
      await loadAll();
      if (dashboard) await loadDashboard(dashPeriod);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRegisteringSale(false);
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
      <AppShell title="Admin" showBack hideCart>
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

  const filteredItems = items.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <AppShell title="Admin" showBack wide hideCart>
      <div className="px-4 pt-3 pb-32">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Painel do criador</h2>
            <p className="text-sm text-muted-foreground">
              {tab === "dashboard"
                ? "Visão geral do negócio"
                : tab === "products"
                ? `${filteredItems.length} de ${items.length} produto(s)`
                : `${orders.length} pedido(s)`}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 shrink-0"
          >
            <LogOut className="h-3 w-3" /> Sair
          </button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <TabsList className="grid grid-cols-3 w-full sm:w-80">
              <TabsTrigger value="dashboard">Vendas</TabsTrigger>
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="orders">Pedidos</TabsTrigger>
            </TabsList>
            {tab === "products" && (
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produto..."
                    className="pl-9"
                  />
                </div>
                <Button onClick={openNew} variant="hero" className="hidden sm:inline-flex gap-2 shrink-0">
                  <Plus className="h-4 w-4" /> Novo produto
                </Button>
              </div>
            )}
            {tab === "dashboard" && (
              <Select value={dashPeriod} onValueChange={(v: any) => setDashPeriod(v)}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABEL) as DashboardData["period"][]).map((p) => (
                    <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="dashboard" className="space-y-4">
            {dashLoading && !dashboard && (
              <p className="text-muted-foreground text-sm">Carregando…</p>
            )}
            {dashboard && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={<Wallet className="h-4 w-4" />}
                    label="Recebido"
                    value={formatBRL(dashboard.revenue.recebido)}
                    tone="success"
                  />
                  <StatCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Aguardando pagamento"
                    value={formatBRL(dashboard.revenue.pendente)}
                    tone="warning"
                  />
                  <StatCard
                    icon={<XCircle className="h-4 w-4" />}
                    label="Cancelado/Rejeitado"
                    value={formatBRL(dashboard.revenue.cancelado)}
                    tone="danger"
                  />
                  <StatCard
                    icon={<PackageSearch className="h-4 w-4" />}
                    label="Pedidos no período"
                    value={String(dashboard.totalOrders)}
                    tone="neutral"
                  />
                </div>

                <div className="bg-card rounded-2xl shadow-soft p-4">
                  <p className="text-sm font-medium mb-3">Pedidos por status</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dashboard.ordersByStatus).map(([status, count]) => (
                      <Badge key={status} variant="secondary" className={STATUS_COLOR[status as OrderStatus]}>
                        {STATUS_LABEL[status as OrderStatus] ?? status}: {count}
                      </Badge>
                    ))}
                  </div>
                  {dashboard.expiredPending > 0 && (
                    <p className="text-xs text-destructive mt-3">
                      {dashboard.expiredPending} pedido(s) pendente(s) com o Pix já expirado — provavelmente não vão ser pagos.
                    </p>
                  )}
                </div>

                <div className="bg-card rounded-2xl shadow-soft p-4">
                  <p className="text-sm font-medium mb-3">Vendas registradas fora do site</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dashboard.externalSales).map(([channel, qty]) => (
                      <Badge key={channel} variant="secondary">
                        {CHANNEL_LABEL[channel] ?? channel}: {qty}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use o ícone <Store className="h-3 w-3 inline" /> na aba Produtos para registrar uma venda feita na Shopee, Mercado Livre etc. e descontar o estoque.
                  </p>
                </div>

                <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
                  <p className="text-sm font-medium p-4 pb-0">Estoque e vendas por produto</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm mt-2">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-t border-border">
                          <th className="p-3 font-medium">Produto</th>
                          <th className="p-3 font-medium">Categoria</th>
                          <th className="p-3 font-medium">Estoque</th>
                          <th className="p-3 font-medium">Vendidos</th>
                          <th className="p-3 font-medium">Receita gerada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.products.map((p) => (
                          <tr key={p.id} className="border-t border-border">
                            <td className="p-3 font-medium">
                              {p.name}
                              {!p.is_active && <span className="ml-1.5 text-xs text-muted-foreground">(inativo)</span>}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {p.category === "bordados" ? "Bordados" : "Impressão 3D"}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="secondary"
                                className={
                                  p.stock === 0
                                    ? "bg-destructive/15 text-destructive"
                                    : p.stock <= 3
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                    : ""
                                }
                              >
                                {p.stock}
                              </Badge>
                            </td>
                            <td className="p-3">{p.sold_qty}</td>
                            <td className="p-3 font-medium text-primary">{formatBRL(p.sold_revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {dashboard.products.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhum produto cadastrado.</p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="products">
            <div className="bg-card rounded-2xl shadow-soft p-3 mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                {mlConnected === null ? (
                  <span className="text-muted-foreground">Verificando conexão com o Mercado Livre…</span>
                ) : mlConnected ? (
                  <span>
                    Mercado Livre conectado{mlNickname ? ` como ${mlNickname}` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Mercado Livre não conectado</span>
                )}
              </div>
              {mlConnected ? (
                <Button variant="outline" size="sm" onClick={handleMlDisconnect} className="gap-1.5">
                  <Link2Off className="h-3.5 w-3.5" /> Desconectar
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleMlConnect} disabled={mlConnecting} className="gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> {mlConnecting ? "Redirecionando..." : "Conectar Mercado Livre"}
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((p) => (
                <div key={p.id} className="bg-card rounded-2xl shadow-soft p-3 flex gap-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-16 w-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{p.name}</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                        {p.category === "bordados" ? "Bordados" : "Impressão 3D"}
                      </Badge>
                      {!p.is_active && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 font-normal ${
                          p.stock === 0
                            ? "bg-destructive/15 text-destructive"
                            : p.stock <= 3
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        Estoque: {p.stock}
                      </Badge>
                      {p.ml_item_id && (
                        <a
                          href={p.ml_permalink ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                        >
                          No Mercado Livre <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatBRL(Number(p.base_price))}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => openEdit(p)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent" aria-label="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openExternalSale(p)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent" aria-label="Registrar venda externa">
                      <Store className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openMlPublish(p)}
                      disabled={mlPublishingId === p.id}
                      className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent disabled:opacity-50"
                      aria-label={p.ml_item_id ? "Atualizar no Mercado Livre" : "Publicar no Mercado Livre"}
                      title={p.ml_item_id ? "Atualizar no Mercado Livre" : "Publicar no Mercado Livre"}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground" aria-label="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                Nenhum produto. Clique em + para criar o primeiro.
              </p>
            )}
            {items.length > 0 && filteredItems.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                Nenhum produto encontrado para "{search}".
              </p>
            )}
          </TabsContent>

          <TabsContent value="orders" className="grid gap-3 lg:grid-cols-2">
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
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={STATUS_COLOR[o.status]} variant="secondary">
                      {STATUS_LABEL[o.status]}
                    </Badge>
                    {isPixExpired(o) && (
                      <Badge variant="secondary" className="bg-destructive/15 text-destructive text-[10px] px-1.5 py-0 font-normal">
                        Pix expirado
                      </Badge>
                    )}
                  </div>
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
                {o.status === "pendente" && o.payment_status !== "approved" && o.pix_qr_code && !isPixExpired(o) && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Pix aguardando pagamento</span>
                      <span>{formatTimeLeft(o.pix_expires_at, now)}</span>
                    </div>
                    <Progress value={pixProgress(o.pix_expires_at, now) ?? 0} className="h-1" />
                  </div>
                )}
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
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-elegant flex items-center justify-center z-30 hover:scale-105 transition-smooth sm:hidden"
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Preço base (R$)</Label>
                <Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) || 0 })} className="mt-1" />
              </div>
              <div>
                <Label>Estoque</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) || 0 })} className="mt-1" />
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

      <Dialog open={!!externalSaleFor} onOpenChange={(v) => !v && setExternalSaleFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar venda externa</DialogTitle>
          </DialogHeader>
          {externalSaleFor && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {externalSaleFor.name} · estoque atual: <strong>{externalSaleFor.stock}</strong>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade vendida</Label>
                  <Input
                    type="number"
                    min={1}
                    value={externalSaleForm.quantity}
                    onChange={(e) => setExternalSaleForm({ ...externalSaleForm, quantity: Number(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Canal</Label>
                  <Select
                    value={externalSaleForm.channel}
                    onValueChange={(v) => setExternalSaleForm({ ...externalSaleForm, channel: v })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shopee">Shopee</SelectItem>
                      <SelectItem value="mercado_livre">Mercado Livre</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Observação (opcional)</Label>
                <Input
                  value={externalSaleForm.note}
                  onChange={(e) => setExternalSaleForm({ ...externalSaleForm, note: e.target.value })}
                  placeholder="Ex: pedido #123 da Shopee"
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Novo estoque após confirmar: <strong>{Math.max(0, externalSaleFor.stock - externalSaleForm.quantity)}</strong>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalSaleFor(null)}>Cancelar</Button>
            <Button onClick={handleRegisterExternalSale} disabled={registeringSale} variant="hero">
              {registeringSale ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mlPublishFor} onOpenChange={(v) => !v && setMlPublishFor(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publicar no Mercado Livre</DialogTitle>
          </DialogHeader>
          {mlPublishFor && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Escolha a categoria certa para <strong>{mlPublishFor.name}</strong>. A categoria errada pode fazer o Mercado Livre pedir campos que não fazem sentido pra esse produto (ex: fabricante/modelo).
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={mlCategoryQuery}
                    onChange={(e) => setMlCategoryQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchMlCategories(mlCategoryQuery)}
                    placeholder="Buscar categoria..."
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => searchMlCategories(mlCategoryQuery)} disabled={mlCategorySearching}>
                  {mlCategorySearching ? "..." : "Buscar"}
                </Button>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {mlCategoryOptions.map((c) => (
                  <button
                    key={c.category_id}
                    onClick={() => setMlSelectedCategory(c)}
                    className={`w-full text-left rounded-xl border-2 p-2.5 text-sm transition-smooth ${
                      mlSelectedCategory?.category_id === c.category_id
                        ? "border-secondary bg-secondary-soft"
                        : "border-border hover:border-secondary/50"
                    }`}
                  >
                    <p className="font-medium">{c.category_name}</p>
                    <p className="text-xs text-muted-foreground">{c.domain_name} · {c.category_id}</p>
                  </button>
                ))}
                {!mlCategorySearching && mlCategoryOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma categoria encontrada. Tente outro termo de busca.
                  </p>
                )}
              </div>

              {mlSelectedCategory && (
                <p className="text-xs text-muted-foreground">
                  Selecionada: <strong>{mlSelectedCategory.category_name}</strong>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMlPublishFor(null)}>Cancelar</Button>
            <Button
              onClick={confirmMlPublish}
              disabled={!mlSelectedCategory || mlPublishingId === mlPublishFor?.id}
              variant="hero"
            >
              {mlPublishingId === mlPublishFor?.id ? "Publicando..." : "Publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

const STAT_TONE: Record<string, string> = {
  success: "bg-green-500/10 text-green-700 dark:text-green-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-primary/10 text-primary",
};

const StatCard = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) => (
  <div className="bg-card rounded-2xl shadow-soft p-4">
    <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${STAT_TONE[tone]}`}>
      {icon}
    </div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-display text-xl font-bold mt-0.5">{value}</p>
  </div>
);

export default Admin;
