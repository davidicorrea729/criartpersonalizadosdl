import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  towelSizes,
  towelColors,
  fontOptions,
  threadColors,
  EMBROIDERY_FEE,
} from "@/data/catalog";
import { useProduct } from "@/hooks/useProducts";
import { useCart, formatBRL } from "@/store/cart";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BordadoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading } = useProduct(id);
  const addItem = useCart((s) => s.addItem);

  const [size, setSize] = useState(towelSizes[0].id);
  const [towelColor, setTowelColor] = useState(towelColors[0].id);
  const [font, setFont] = useState(fontOptions[0].id);
  const [text, setText] = useState("");
  const [threadColor, setThreadColor] = useState(threadColors[0].id);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const sizeOpt = towelSizes.find((s) => s.id === size)!;
  const fontOpt = fontOptions.find((f) => f.id === font)!;
  const threadOpt = threadColors.find((t) => t.id === threadColor)!;
  const towelColorOpt = towelColors.find((t) => t.id === towelColor)!;

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const base = Number(product.base_price) * sizeOpt.multiplier;
    const fee = text.trim().length > 0 ? EMBROIDERY_FEE : 0;
    return Math.round((base + fee) * 100) / 100;
  }, [product, sizeOpt, text]);

  if (loading) {
    return (
      <AppShell title="Produto" showBack>
        <div className="p-6 text-center text-muted-foreground">Carregando...</div>
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell title="Produto" showBack>
        <div className="p-6 text-center text-muted-foreground">Produto não encontrado.</div>
      </AppShell>
    );
  }

  const handleAdd = () => {
    addItem({
      productId: product.id,
      category: "bordados",
      name: product.name,
      image: product.image_url,
      unitPrice,
      quantity,
      customization: {
        size: sizeOpt.label,
        towelColor: towelColorOpt.label,
        font: fontOpt.label,
        text: text.trim(),
        threadColor: threadOpt.label,
        notes: notes.trim() || undefined,
      },
    });
    toast.success("Adicionado ao carrinho!");
    navigate("/carrinho");
  };

  return (
    <AppShell title={product.name} showBack wide>
      <div className="md:flex md:gap-8 md:px-8 md:pt-6">
        {/* Imagem + preview */}
        <div className="relative md:w-[42%] md:flex-shrink-0 md:self-start md:sticky md:top-20 md:rounded-2xl md:overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full aspect-square object-cover"
          />
          {/* Preview do bordado */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-elegant min-w-[60%] text-center"
            style={{ backgroundColor: towelColorOpt.hex }}
          >
            <p
              className={cn(fontOpt.className, "text-2xl truncate")}
              style={{ color: threadOpt.hex }}
            >
              {text || "Seu nome"}
            </p>
          </div>
        </div>

      <div className="p-5 md:p-0 md:flex-1 space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold">{product.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
        </div>

        <Section label="Tamanho">
          <div className="grid grid-cols-3 gap-2">
            {towelSizes.map((s) => (
              <Pill key={s.id} active={size === s.id} onClick={() => setSize(s.id)}>
                {s.label}
              </Pill>
            ))}
          </div>
        </Section>

        <Section label="Cor da toalha">
          <div className="flex flex-wrap gap-2">
            {towelColors.map((c) => (
              <Swatch
                key={c.id}
                hex={c.hex}
                label={c.label}
                active={towelColor === c.id}
                onClick={() => setTowelColor(c.id)}
              />
            ))}
          </div>
        </Section>

        <Section label="Nome ou frase para bordar">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 30))}
            placeholder="Ex: Maria"
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {text.length}/30 caracteres • Taxa de bordado: {formatBRL(EMBROIDERY_FEE)}
          </p>
        </Section>

        <Section label="Tipo de fonte">
          <div className="grid grid-cols-2 gap-2">
            {fontOptions.map((f) => (
              <button
                key={f.id}
                onClick={() => setFont(f.id)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-smooth text-center",
                  font === f.id
                    ? "border-secondary bg-secondary-soft"
                    : "border-border bg-card"
                )}
              >
                <span className={cn(f.className, "text-lg")}>Aa</span>
                <p className="text-[10px] text-muted-foreground mt-1">{f.label}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Cor do bordado">
          <div className="flex flex-wrap gap-2">
            {threadColors.map((c) => (
              <Swatch
                key={c.id}
                hex={c.hex}
                label={c.label}
                active={threadColor === c.id}
                onClick={() => setThreadColor(c.id)}
              />
            ))}
          </div>
        </Section>

        <Section label="Quantidade">
          <QtyControl value={quantity} onChange={setQuantity} />
        </Section>

        <Section label="Observações">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Algum detalhe especial?"
            rows={3}
          />
        </Section>
      </div>
      </div>

      {/* Sticky footer — sempre visível */}
      <div className="fixed bottom-16 inset-x-0 md:bottom-0 border-t bg-background/95 backdrop-blur p-4 z-30">
        <div className="max-w-md md:max-w-3xl mx-auto flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-display text-xl font-bold text-secondary">
              {formatBRL(unitPrice * quantity)}
            </p>
          </div>
          <Button onClick={handleAdd} variant="warm" size="lg" className="flex-1">
            Adicionar
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
      {label}
    </Label>
    <div className="mt-2">{children}</div>
  </div>
);

const Pill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-2 rounded-xl text-xs font-medium border-2 transition-smooth",
      active
        ? "border-secondary bg-secondary-soft text-foreground"
        : "border-border bg-card text-muted-foreground hover:border-secondary/50"
    )}
  >
    {children}
  </button>
);

const Swatch = ({
  hex,
  label,
  active,
  onClick,
}: {
  hex: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "h-10 w-10 rounded-full border-2 transition-smooth flex items-center justify-center",
      active ? "border-secondary scale-110 shadow-soft" : "border-border"
    )}
    style={{ backgroundColor: hex }}
  >
    {active && (
      <span
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor: hex === "#FFFFFF" || hex === "#E8DCC4" ? "#1A1A1A" : "#FFFFFF",
        }}
      />
    )}
  </button>
);

const QtyControl = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) => (
  <div className="flex items-center gap-3">
    <button
      onClick={() => onChange(Math.max(1, value - 1))}
      className="h-10 w-10 rounded-full border-2 border-border bg-card font-bold text-lg hover:border-secondary transition-smooth"
    >
      −
    </button>
    <span className="font-display text-xl font-semibold w-8 text-center">{value}</span>
    <button
      onClick={() => onChange(value + 1)}
      className="h-10 w-10 rounded-full border-2 border-border bg-card font-bold text-lg hover:border-secondary transition-smooth"
    >
      +
    </button>
  </div>
);

export default BordadoDetalhe;
