import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrders, STATUS_LABEL, STATUS_COLOR, isPixExpired, pixProgress, type Order } from "@/hooks/useOrders";
import { formatBRL } from "@/store/cart";
import { Package, Loader2 } from "lucide-react";

const formatTimeLeft = (pixExpiresAt: string | null, now: number) => {
  if (!pixExpiresAt) return "";
  const ms = new Date(pixExpiresAt).getTime() - now;
  if (ms <= 0) return "expirado";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `expira em ${h}h${String(m).padStart(2, "0")}` : `expira em ${m}min`;
};

const isPixActive = (o: Order) =>
  o.status === "pendente" && o.payment_status !== "approved" && !!o.pix_qr_code && !isPixExpired(o);

const Pedidos = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppShell title="Meus pedidos" showBack wide>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return <PedidosList userId={user.id} />;
};

const PedidosList = ({ userId }: { userId: string }) => {
  const { data: orders, isLoading } = useMyOrders(userId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <AppShell title="Meus pedidos" showBack wide>
      <div className="px-4 pt-4 pb-10 md:px-8">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (!orders || orders.length === 0) && (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-lg font-bold">Nenhum pedido ainda</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-5">
              Faça seu primeiro pedido!
            </p>
            <Button asChild variant="hero">
              <Link to="/">Explorar catálogo</Link>
            </Button>
          </div>
        )}

        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
          {orders?.map((o) => (
            <div key={o.id} className="bg-card rounded-2xl shadow-soft p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Pedido #{o.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
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

              <div className="space-y-1.5 my-3 border-t pt-3">
                {o.order_items?.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm gap-2">
                    <span className="truncate">
                      {it.quantity}× {it.name}
                    </span>
                    <span className="font-medium flex-shrink-0">
                      {formatBRL(Number(it.unit_price) * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {isPixActive(o) && (
                <div className="mb-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Pix aguardando pagamento</span>
                    <span>{formatTimeLeft(o.pix_expires_at, now)}</span>
                  </div>
                  <Progress value={pixProgress(o.pix_expires_at, now) ?? 0} className="h-1" />
                </div>
              )}

              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="font-display font-bold text-primary">
                  {formatBRL(Number(o.total))}
                </span>
              </div>

              {isPixExpired(o) && (
                <Button asChild variant="warm" size="sm" className="w-full mt-3">
                  <Link to={`/pagamento/${o.id}`}>Gerar novo Pix</Link>
                </Button>
              )}
              {isPixActive(o) && (
                <Button asChild variant="outline" size="sm" className="w-full mt-3">
                  <Link to={`/pagamento/${o.id}`}>Ver pagamento</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Pedidos;
