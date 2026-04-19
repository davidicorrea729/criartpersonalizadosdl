import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, User, MessageCircle } from "lucide-react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/carrinho", icon: ShoppingBag, label: "Carrinho", badge: true },
  { to: "/contato", icon: MessageCircle, label: "Contato" },
  { to: "/conta", icon: User, label: "Conta" },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  const count = useCart((s) => s.count());

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {items.map(({ to, icon: Icon, label, badge }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 transition-smooth relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {badge && count > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
