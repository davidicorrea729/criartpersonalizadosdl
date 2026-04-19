import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useCart, formatBRL } from "@/store/cart";
import { Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const Carrinho = () => {
  const { items, removeItem, updateQuantity, total, clear } = useCart();
  const subtotal = total();

  if (items.length === 0) {
    return (
      <AppShell title="Carrinho" showBack>
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
    <AppShell title="Carrinho" showBack>
      <div className="px-4 pt-4 space-y-3">
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
          className="text-xs text-muted-foreground underline mx-auto block pt-2"
        >
          Limpar carrinho
        </button>
      </div>

      <div className="fixed bottom-16 inset-x-0 md:bottom-0 border-t bg-background/95 backdrop-blur p-4 z-30">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between mb-3">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-display text-2xl font-bold text-primary">
              {formatBRL(subtotal)}
            </span>
          </div>
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={() => toast.info("Checkout estará disponível na Fase 3 (pagamentos)")}
          >
            Finalizar pedido
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

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
