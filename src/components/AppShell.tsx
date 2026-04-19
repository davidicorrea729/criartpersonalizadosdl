import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

export const AppShell = ({ children, title, showBack }: AppShellProps) => (
  <div className="min-h-screen bg-background flex flex-col">
    <AppHeader title={title} showBack={showBack} />
    <main className="flex-1 max-w-md w-full mx-auto pb-24 animate-fade-in">
      {children}
    </main>
    <BottomNav />
  </div>
);
