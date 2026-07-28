import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useCart, formatBRL } from "@/store/cart";
import { Trash2, ShoppingBag, Loader2, QrCode, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type PaymentMethod = "pix" | "checkout_pro";

const Carrinho = () => {
  const { items, removeItem, updateQuantity, total, clear } = useCart();
  const subtotal = total();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  const handleCheckout = async () => {
    if (!user) {
      toast.info("Entre na sua conta para finalizar o pedido");
      return navigate("/auth");
    }
    if (!profile?.full_name || !profile?.phone || !profile?.street) {
      toast.info("Complete seus dados de contato e endereço antes de finalizar");
      return navigate("/conta");
    }
    setSubmitting(true);
    try {
      const address = `${profile.street}, ${profile.number}${profile.complement ? " - " + profile.complement : ""} - ${profile.neighborhood}, ${profile.city}/${profile.state} - CEP ${profile.cep}`;
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "pendente",
          total: subtotal,
          customer_name: profile.full_name,
          customer_phone: profile.phone,
          shipping_address: address,
          payment_method: paymentMethod,
          payment_status: "pending",
        })
        .select()
        .single();
      if (oErr) throw oErr;

      const itemsPayload = items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        category: i.category,
        name: i.name,
        image_url: i.image,
        unit_price: i.unitPrice,
        quantity: i.quantity,
        customization: i.customization as any,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(itemsPayload);
      if (iErr) throw iErr;

      clear();

      if (paymentMethod === "checkout_pro") {
        const { data, error } = await supabase.functions.invoke("create-checkout-preference", {
          body: { orderId: order.id },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        toast.success("Pedido criado! Redirecionando para pagamento...");
        window.location.href = data.init_point;
        return;
      }

      toast.success("Pedido criado! Pague com PIX para confirmar.");
      navigate(`/pagamento/${order.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <AppShell title="Carrinho" showBack wide>
        <div className="px-5 py-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold">Seu carrinho está vazio</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Que tal explorar nossos catálogos?
          </p>
          <div className="flex flex-col gap-2 mt-6 max-w-xs mx-auto">
            <Button asChild variant="warm" size="lg">
              <Link to="/bordados">Ver Bordados</Link>
            </Button>
            <Button asChild variant="hero" size="lg">
              <Link to="/impressao3d">Ver Impressão 3D</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Carrinho" showBack wide>
      <div className="md:flex md:gap-8 md:px-4 md:pt-4 md:items-start">
      <div className="px-4 pt-4 space-y-3 md:px-0 md:pt-0 md:flex-1">
        {items.map((item) => (
          <div key={item.id} className="bg-card rounded-2xl shadow-soft p-3 flex gap-3">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="h-20 w-20 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-2">
                <h3 className="font-medium text-sm leading-tight">{item.name}</h3>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-smooth flex-shrink-0"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <CustomizationSummary item={item} />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="h-7 w-7 rounded-full border border-border text-sm"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-7 w-7 rounded-full border border-border text-sm"
                  >
                    +
                  </button>
                </div>
                <p className="font-bold text-sm">
                  {formatBRL(item.unitPrice * item.quantity)}
                </p>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => {
            clear();
            toast.success("Carrinho limpo");
          }}
          className="text-xs text-muted-foreground underline mx-auto block pt-2 md:mx-0"
        >
          Limpar carrinho
        </button>
      </div>

      {/* Resumo — barra lateral fixa no desktop */}
      <div className="hidden md:block md:w-72 md:flex-shrink-0 md:sticky md:top-20">
        <div className="bg-card rounded-2xl shadow-soft p-4">
          <div className="flex justify-between mb-3">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-display text-2xl font-bold text-primary">
              {formatBRL(subtotal)}
            </span>
          </div>
          <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
          <Button
            variant="hero"
            size="xl"
            className="w-full mt-3"
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              "Finalizar pedido"
            )}
          </Button>
        </div>
      </div>
      </div>

      {/* Resumo — barra fixa no rodapé no mobile */}
      <div className="fixed bottom-16 inset-x-0 border-t bg-background/95 backdrop-blur p-4 z-30 md:hidden">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between mb-3">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-display text-2xl font-bold text-primary">
              {formatBRL(subtotal)}
            </span>
          </div>
          <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
          <Button
            variant="hero"
            size="xl"
            className="w-full mt-3"
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              "Finalizar pedido"
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

const PaymentMethodPicker = ({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1.5">Forma de pagamento</p>
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange("pix")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-sm font-medium transition-smooth",
          value === "pix" ? "border-secondary bg-secondary-soft" : "border-border text-muted-foreground"
        )}
      >
        <QrCode className="h-4 w-4" /> Pix
      </button>
      <button
        type="button"
        onClick={() => onChange("checkout_pro")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-sm font-medium transition-smooth",
          value === "checkout_pro" ? "border-secondary bg-secondary-soft" : "border-border text-muted-foreground"
        )}
      >
        <CreditCard className="h-4 w-4" /> Cartão / outros
      </button>
    </div>
  </div>
);

const CustomizationSummary = ({ item }: { item: ReturnType<typeof useCart.getState>["items"][0] }) => {
  const c = item.customization;
  const parts: string[] = [];
  if (c.size) parts.push(c.size);
  if (c.towelColor) parts.push(`Toalha: ${c.towelColor}`);
  if (c.text) parts.push(`"${c.text}"`);
  if (c.threadColor) parts.push(`Linha: ${c.threadColor}`);
  if (c.material) parts.push(c.material);
  if (c.printColor) parts.push(c.printColor);
  if (c.quality) parts.push(c.quality);
  if (c.scale) parts.push(`${c.scale}%`);
  if (c.stlFileName) parts.push(c.stlFileName);
  return (
    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
      {parts.join(" • ")}
    </p>
  );
};

export default Carrinho;
