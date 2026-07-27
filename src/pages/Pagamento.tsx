import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/store/cart";
import { Copy, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  user_id: string;
  total: number;
  status: string;
  payment_status: string;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_expires_at: string | null;
  mp_payment_id: string | null;
}

const Pagamento = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // ticking timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // load order
  useEffect(() => {
    if (!user || !orderId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, user_id, total, status, payment_status, pix_qr_code, pix_qr_code_base64, pix_expires_at, mp_payment_id",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setError("Pedido não encontrado");
        return;
      }
      setOrder(data as OrderRow);
      if (!data.pix_qr_code) await generatePix(orderId);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orderId]);

  // realtime status
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => ({ ...(prev as OrderRow), ...(payload.new as OrderRow) }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const generatePix = async (id: string) => {
    setGenerating(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-pix-payment",
        { body: { orderId: id } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // refetch
      const { data: fresh } = await supabase
        .from("orders")
        .select(
          "id, user_id, total, status, payment_status, pix_qr_code, pix_qr_code_base64, pix_expires_at, mp_payment_id",
        )
        .eq("id", id)
        .maybeSingle();
      if (fresh) setOrder(fresh as OrderRow);
    } catch (e: any) {
      setError(e.message || "Erro ao gerar PIX");
    } finally {
      setGenerating(false);
    }
  };

  const remaining = useMemo(() => {
    if (!order?.pix_expires_at) return null;
    const ms = new Date(order.pix_expires_at).getTime() - now;
    if (ms <= 0) return "Expirado";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [order?.pix_expires_at, now]);

  const isApproved = order?.payment_status === "approved";
  const isFailed =
    order?.payment_status === "rejected" ||
    order?.payment_status === "cancelled";
  const isExpired = remaining === "Expirado";

  const copy = async () => {
    if (!order?.pix_qr_code) return;
    await navigator.clipboard.writeText(order.pix_qr_code);
    toast.success("Código PIX copiado!");
  };

  if (loading) {
    return (
      <AppShell title="Pagamento PIX" showBack>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppShell title="Pagamento PIX" showBack>
      <div className="px-4 pt-4 pb-10 max-w-md mx-auto space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl">
            {error}
          </div>
        )}

        {order && (
          <div className="bg-card rounded-2xl shadow-soft p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={order.payment_status} />
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-bold text-primary">
                {formatBRL(Number(order.total))}
              </span>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <h2 className="font-display font-bold text-lg">
              Pagamento confirmado!
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Seu pedido entrou em produção.
            </p>
            <Button
              className="mt-4 w-full"
              variant="hero"
              onClick={() => navigate("/pedidos")}
            >
              Ver meus pedidos
            </Button>
          </div>
        )}

        {isFailed && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <h2 className="font-display font-bold text-lg">
              Pagamento não concluído
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              O pagamento foi cancelado ou rejeitado.
            </p>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => orderId && generatePix(orderId)}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {!isApproved && !isFailed && (
          <>
            {generating && !order?.pix_qr_code && (
              <div className="flex flex-col items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground mt-3">
                  Gerando QR Code PIX...
                </p>
              </div>
            )}

            {order?.pix_qr_code && isExpired && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 text-center">
                <Clock className="h-10 w-10 text-destructive mx-auto mb-2" />
                <h2 className="font-display font-bold text-lg">Código Pix expirado</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O prazo para pagar esse código já passou. Gere um novo para continuar.
                </p>
                <Button
                  className="mt-4 w-full"
                  variant="warm"
                  onClick={() => generatePix(orderId!)}
                  disabled={generating}
                >
                  {generating ? "Gerando..." : "Gerar novo código Pix"}
                </Button>
              </div>
            )}

            {order?.pix_qr_code && !isExpired && (
              <div className="bg-card rounded-2xl shadow-soft p-4 space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Expira em</span>
                  <span className="font-mono font-semibold">
                    {remaining ?? "--:--:--"}
                  </span>
                </div>

                {order.pix_qr_code_base64 && (
                  <div className="bg-white p-3 rounded-xl flex justify-center">
                    <img
                      src={`data:image/png;base64,${order.pix_qr_code_base64}`}
                      alt="QR Code PIX"
                      className="w-56 h-56"
                    />
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Código PIX (copia e cola)
                  </p>
                  <div className="bg-muted rounded-xl p-3 font-mono text-[11px] break-all max-h-24 overflow-y-auto">
                    {order.pix_qr_code}
                  </div>
                  <Button
                    onClick={copy}
                    variant="warm"
                    className="w-full mt-2"
                    size="lg"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar código
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Após pagar, esta tela atualiza automaticamente.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Aguardando", cls: "bg-muted text-muted-foreground" },
    in_process: {
      label: "Processando",
      cls: "bg-secondary/20 text-secondary-foreground",
    },
    approved: {
      label: "Aprovado",
      cls: "bg-green-500/20 text-green-700 dark:text-green-400",
    },
    rejected: { label: "Rejeitado", cls: "bg-destructive/20 text-destructive" },
    cancelled: {
      label: "Cancelado",
      cls: "bg-destructive/20 text-destructive",
    },
    refunded: { label: "Estornado", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status] || { label: status, cls: "bg-muted" };
  return (
    <Badge variant="secondary" className={v.cls}>
      {v.label}
    </Badge>
  );
};

export default Pagamento;
