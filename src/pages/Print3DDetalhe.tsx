import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Upload, FileBox } from "lucide-react";
import {
  products,
  materials,
  qualities,
  printColors,
  STL_BASE_PRICE,
} from "@/data/catalog";
import { useCart, formatBRL } from "@/store/cart";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  uploadMode?: boolean;
}

const Print3DDetalhe = ({ uploadMode = false }: Props) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCart((s) => s.addItem);
  const fileRef = useRef<HTMLInputElement>(null);

  const product = uploadMode
    ? null
    : products.find((p) => p.id === id && p.category === "impressao3d");

  const [material, setMaterial] = useState(materials[0].id);
  const [color, setColor] = useState(printColors[0].id);
  const [quality, setQuality] = useState(qualities[1].id);
  const [scale, setScale] = useState([100]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [stlFile, setStlFile] = useState<File | null>(null);

  const materialOpt = materials.find((m) => m.id === material)!;
  const qualityOpt = qualities.find((q) => q.id === quality)!;
  const colorOpt = printColors.find((c) => c.id === color)!;

  const basePrice = uploadMode ? STL_BASE_PRICE : product?.basePrice ?? 0;
  const scaleFactor = (scale[0] / 100) ** 1.5; // volume cresce não linearmente

  const unitPrice = useMemo(() => {
    const p = basePrice * materialOpt.multiplier * qualityOpt.multiplier * scaleFactor;
    return Math.round(p * 100) / 100;
  }, [basePrice, materialOpt, qualityOpt, scaleFactor]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.name.toLowerCase().endsWith(".stl")) {
        toast.error("Envie um arquivo .stl");
        return;
      }
      setStlFile(f);
      toast.success("Arquivo carregado");
    }
  };

  const handleAdd = () => {
    if (uploadMode && !stlFile) {
      toast.error("Envie um arquivo STL primeiro");
      return;
    }
    addItem({
      productId: product?.id ?? `stl-${Date.now()}`,
      category: "impressao3d",
      name: product?.name ?? `Peça personalizada (${stlFile?.name})`,
      image: product?.image ?? "",
      unitPrice,
      quantity,
      customization: {
        material: materialOpt.label,
        printColor: colorOpt.label,
        quality: qualityOpt.label,
        scale: scale[0],
        stlFileName: stlFile?.name,
        notes: notes.trim() || undefined,
      },
    });
    toast.success("Adicionado ao carrinho!");
    navigate("/carrinho");
  };

  const title = uploadMode ? "Enviar STL" : product?.name ?? "Produto";

  return (
    <AppShell title={title} showBack>
      {!uploadMode && product && (
        <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
      )}

      {uploadMode && (
        <div className="px-5 pt-5">
          <button
            onClick={() => fileRef.current?.click()}
            className={cn(
              "w-full rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-3 transition-smooth",
              stlFile
                ? "border-success bg-success/5"
                : "border-border hover:border-primary bg-muted/30"
            )}
          >
            {stlFile ? (
              <>
                <FileBox className="h-10 w-10 text-success" />
                <div className="text-center">
                  <p className="font-medium text-sm">{stlFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(stlFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <span className="text-xs text-primary underline">Trocar arquivo</span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Toque para enviar</p>
                  <p className="text-xs text-muted-foreground mt-1">Apenas .stl</p>
                </div>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".stl"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      <div className="p-5 space-y-5">
        {!uploadMode && product && (
          <div>
            <h2 className="font-display text-2xl font-bold">{product.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
          </div>
        )}

        <Section label="Material">
          <div className="grid grid-cols-3 gap-2">
            {materials.map((m) => (
              <Pill key={m.id} active={material === m.id} onClick={() => setMaterial(m.id)}>
                {m.label}
              </Pill>
            ))}
          </div>
        </Section>

        <Section label="Cor">
          <div className="flex flex-wrap gap-2">
            {printColors.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                aria-label={c.label}
                title={c.label}
                className={cn(
                  "h-10 w-10 rounded-full border-2 transition-smooth",
                  color === c.id ? "border-primary scale-110 shadow-soft" : "border-border"
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </Section>

        <Section label="Qualidade">
          <div className="grid grid-cols-3 gap-2">
            {qualities.map((q) => (
              <Pill key={q.id} active={quality === q.id} onClick={() => setQuality(q.id)}>
                {q.label}
              </Pill>
            ))}
          </div>
        </Section>

        <Section label={`Escala: ${scale[0]}%`}>
          <Slider value={scale} onValueChange={setScale} min={50} max={200} step={5} />
        </Section>

        <Section label="Quantidade">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-10 w-10 rounded-full border-2 border-border bg-card font-bold text-lg"
            >
              −
            </button>
            <span className="font-display text-xl font-semibold w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10 rounded-full border-2 border-border bg-card font-bold text-lg"
            >
              +
            </button>
          </div>
        </Section>

        <Section label="Observações">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes adicionais sobre a peça?"
            rows={3}
          />
        </Section>
      </div>

      <div className="fixed bottom-0 inset-x-0 md:hidden border-t bg-background/95 backdrop-blur p-4 z-30">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-display text-xl font-bold text-primary">
              {formatBRL(unitPrice * quantity)}
            </p>
          </div>
          <Button onClick={handleAdd} variant="hero" size="lg" className="flex-1">
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
      "px-2 py-2 rounded-xl text-xs font-medium border-2 transition-smooth",
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border bg-card text-muted-foreground hover:border-primary/50"
    )}
  >
    {children}
  </button>
);

export default Print3DDetalhe;
