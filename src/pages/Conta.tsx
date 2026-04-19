import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { User, LogIn, Package, Settings, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Conta = () => (
  <AppShell title="Minha Conta" showBack>
    <div className="px-5 pt-6">
      <div className="flex flex-col items-center text-center py-6">
        <div className="h-20 w-20 rounded-full gradient-hero flex items-center justify-center text-primary-foreground shadow-elegant">
          <User className="h-10 w-10" />
        </div>
        <h2 className="font-display text-xl font-bold mt-4">Bem-vindo!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Entre para acompanhar pedidos e personalizações
        </p>
        <Button
          variant="hero"
          size="lg"
          className="mt-5 w-full"
          onClick={() => toast.info("Login será ativado na Fase 2 (Lovable Cloud)")}
        >
          <LogIn className="mr-2 h-4 w-4" /> Entrar / Cadastrar
        </Button>
      </div>

      <div className="mt-8 space-y-2">
        <MenuItem icon={<Package className="h-5 w-5" />} label="Meus pedidos" />
        <MenuItem icon={<Settings className="h-5 w-5" />} label="Endereços e dados" />
      </div>
    </div>
  </AppShell>
);

const MenuItem = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <button
    onClick={() => toast.info("Em breve")}
    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card shadow-soft hover:shadow-card transition-smooth"
  >
    <span className="text-primary">{icon}</span>
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export default Conta;
