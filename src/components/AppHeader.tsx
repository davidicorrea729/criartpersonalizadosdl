import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
}

export const AppHeader = ({ title, showBack }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const count = useCart((s) => s.count());
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && !isHome ? (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-smooth"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link to="/" className="font-display text-xl font-bold text-primary">
              Atelier<span className="text-secondary">.</span>
            </Link>
          )}
          {title && (
            <h1 className="font-display text-lg font-semibold truncate">{title}</h1>
          )}
        </div>
        <Link
          to="/carrinho"
          className="relative p-2 rounded-full hover:bg-muted transition-smooth"
          aria-label="Carrinho"
        >
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};
