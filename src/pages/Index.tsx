import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import heroBordados from "@/assets/hero-bordados.jpg";
import hero3d from "@/assets/hero-3d.jpg";
import { Sparkles, Printer, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <AppShell wide>
      {/* Hero */}
      <section className="px-5 pt-6 pb-4 md:px-8 md:pt-10 md:pb-6 md:max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold">
          Atelier Personalizado
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-1 leading-tight">
          Crie peças únicas <span className="text-secondary">com a sua cara</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Bordados artesanais e impressão 3D sob demanda — entregues prontos para você.
        </p>
      </section>

      {/* Categorias */}
      <section className="px-5 md:px-8 grid gap-4 md:grid-cols-2 md:gap-6">
        <CategoryCard
          to="/bordados"
          image={heroBordados}
          tag="Artesanal"
          title="Bordados em Toalhas"
          subtitle="Personalize cor, fonte e nome"
          icon={<Sparkles className="h-5 w-5" />}
          variant="warm"
        />
        <CategoryCard
          to="/impressao3d"
          image={hero3d}
          tag="Sob demanda"
          title="Impressão 3D"
          subtitle="Catálogo + envio do seu STL"
          icon={<Printer className="h-5 w-5" />}
          variant="cool"
        />
      </section>

      {/* Como funciona */}
      <section className="px-5 md:px-8 mt-10">
        <h2 className="font-display text-xl font-semibold mb-4">Como funciona</h2>
        <ol className="space-y-3 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
          {[
            "Escolha o produto e personalize",
            "Adicione ao carrinho e finalize",
            "Pague com PIX ou cartão",
            "Acompanhe a produção em tempo real",
          ].map((s, i) => (
            <li key={i} className="flex gap-3 items-start md:flex-col md:gap-2">
              <span className="flex-shrink-0 h-7 w-7 rounded-full gradient-hero text-primary-foreground text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm text-foreground/80 pt-0.5 md:pt-0">{s}</span>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
};

interface CategoryCardProps {
  to: string;
  image: string;
  tag: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  variant: "warm" | "cool";
}

const CategoryCard = ({ to, image, tag, title, subtitle, icon, variant }: CategoryCardProps) => (
  <Link
    to={to}
    className="group relative block rounded-3xl overflow-hidden shadow-card hover:shadow-elegant transition-smooth animate-scale-in"
  >
    <img
      src={image}
      alt={title}
      className="w-full h-48 object-cover group-hover:scale-105 transition-smooth"
      loading="lazy"
    />
    <div
      className={`absolute inset-0 ${
        variant === "warm"
          ? "bg-gradient-to-t from-secondary/90 via-secondary/30 to-transparent"
          : "bg-gradient-to-t from-primary/90 via-primary/30 to-transparent"
      }`}
    />
    <div className="absolute inset-0 p-5 flex flex-col justify-end text-primary-foreground">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-widest font-bold bg-background/20 backdrop-blur px-2 py-1 rounded-full">
          {tag}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h3>
          <p className="text-sm opacity-90 mt-1">{subtitle}</p>
        </div>
        <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-smooth" />
      </div>
    </div>
  </Link>
);

export default Index;
