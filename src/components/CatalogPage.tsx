import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { type Category } from "@/data/catalog";
import { formatBRL } from "@/store/cart";
import { useProducts } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

interface CatalogPageProps {
  category: Category;
  title: string;
  subtitle: string;
  basePath: string;
}

export const CatalogPage = ({ category, title, subtitle, basePath }: CatalogPageProps) => {
  const { products, loading } = useProducts(category);

  return (
    <AppShell title={title} showBack wide>
      <div className="px-5 md:px-8 pt-4 pb-2">
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {loading ? (
        <div className="px-5 md:px-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="px-5 md:px-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-2">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`${basePath}/${p.id}`}
              className="group bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-smooth"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm leading-tight line-clamp-2">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">a partir de</p>
                <p className="text-secondary font-bold text-sm">
                  {formatBRL(Number(p.base_price))}
                </p>
              </div>
            </Link>
          ))}
          {products.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-12">
              Nenhum produto cadastrado ainda.
            </p>
          )}
        </div>
      )}

      {category === "impressao3d" && (
        <div className="px-5 md:px-8 mt-6">
          <Link
            to="/impressao3d/upload"
            className="block md:max-w-sm rounded-2xl gradient-hero text-primary-foreground p-5 shadow-elegant transition-smooth hover:opacity-95"
          >
            <p className="text-xs uppercase tracking-widest opacity-80">Sob demanda</p>
            <p className="font-display text-lg font-bold mt-1">Envie seu arquivo STL</p>
            <p className="text-sm opacity-90 mt-1">Imprimimos sua peça personalizada</p>
          </Link>
        </div>
      )}
    </AppShell>
  );
};
