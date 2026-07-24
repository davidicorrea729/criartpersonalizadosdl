import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  /** Uses the full desktop width instead of staying capped at mobile-app width. For dashboard-style pages like Admin. */
  wide?: boolean;
  hideCart?: boolean;
}

export const AppShell = ({ children, title, showBack, wide, hideCart }: AppShellProps) => (
  <div className="min-h-screen bg-background flex flex-col">
    <AppHeader title={title} showBack={showBack} hideCart={hideCart} wide={wide} />
    <main className={cn("flex-1 w-full mx-auto pb-24 animate-fade-in", wide ? "max-w-5xl" : "max-w-md")}>
      {children}
    </main>
    <BottomNav />
  </div>
);
