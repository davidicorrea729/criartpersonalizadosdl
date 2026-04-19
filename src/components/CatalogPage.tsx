import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { products, type Category } from "@/data/catalog";
import { formatBRL } from "@/store/cart";

interface CatalogPageProps {
  category: Category;
  title: string;
  subtitle: string;
  basePath: string;
}

export const CatalogPage = ({ category, title, subtitle, basePath }: CatalogPageProps) => {
  const list = products.filter((p) => p.category === category);

  return (
    <AppShell title={title} showBack>
      <div className="px-5 pt-4 pb-2">
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="px-5 grid grid-cols-2 gap-3 mt-2">
        {list.map((p) => (
          <Link
            key={p.id}
            to={`${basePath}/${p.id}`}
            className="group bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-smooth"
          >
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={p.image}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm leading-tight line-clamp-2">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">a partir de</p>
              <p className="text-secondary font-bold text-sm">{formatBRL(p.basePrice)}</p>
            </div>
          </Link>
        ))}
      </div>

      {category === "impressao3d" && (
        <div className="px-5 mt-6">
          <Link
            to="/impressao3d/upload"
            className="block rounded-2xl gradient-hero text-primary-foreground p-5 shadow-elegant transition-smooth hover:opacity-95"
          >
            <p className="text-xs uppercase tracking-widest opacity-80">Sob demanda</p>
            <p className="font-display text-lg font-bold mt-1">
              Envie seu arquivo STL
            </p>
            <p className="text-sm opacity-90 mt-1">
              Imprimimos sua peça personalizada
            </p>
          </Link>
        </div>
      )}
    </AppShell>
  );
};
