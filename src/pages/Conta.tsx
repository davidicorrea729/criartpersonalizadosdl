import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, LogIn, Package, ShieldCheck, LogOut, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Conta = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    full_name: "", phone: "", cep: "", street: "", number: "",
    complement: "", neighborhood: "", city: "", state: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        cep: profile.cep || "",
        street: profile.street || "",
        number: profile.number || "",
        complement: profile.complement || "",
        neighborhood: profile.neighborhood || "",
        city: profile.city || "",
        state: profile.state || "",
      });
    }
  }, [profile]);

  if (!user) {
    return (
      <AppShell title="Minha Conta" showBack wide>
        <div className="px-5 pt-6 md:max-w-md md:mx-auto">
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
              onClick={() => navigate("/auth")}
            >
              <LogIn className="mr-2 h-4 w-4" /> Entrar / Cadastrar
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(form)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Dados salvos!");
  };

  return (
    <AppShell title="Minha Conta" showBack wide>
      <div className="px-5 pt-5 pb-10 md:max-w-2xl md:mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-14 w-14 rounded-full gradient-hero flex items-center justify-center text-primary-foreground">
            <User className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold truncate">
              {profile?.full_name || "Olá!"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
          >
            <LogOut className="h-3 w-3" /> Sair
          </button>
        </div>

        <div className="space-y-2 mb-6">
          <Link to="/pedidos" className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card shadow-soft hover:shadow-card transition-smooth">
            <span className="text-primary"><Package className="h-5 w-5" /></span>
            <span className="font-medium text-sm">Meus pedidos</span>
          </Link>
          {isAdmin && (
            <Link to="/admin" className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card shadow-soft hover:shadow-card transition-smooth">
              <span className="text-primary"><ShieldCheck className="h-5 w-5" /></span>
              <span className="font-medium text-sm">Painel do criador</span>
            </Link>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-soft p-4">
          <h3 className="font-display font-bold mb-3">Endereço e contato</h3>
          <div className="space-y-3">
            <Pair>
              <Item label="Nome">
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Item>
              <Item label="Telefone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Item>
            </Pair>
            <Pair>
              <Item label="CEP">
                <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
              </Item>
              <Item label="Estado">
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} />
              </Item>
            </Pair>
            <Item label="Rua">
              <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </Item>
            <Pair>
              <Item label="Número">
                <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
              </Item>
              <Item label="Complemento">
                <Input value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
              </Item>
            </Pair>
            <Pair>
              <Item label="Bairro">
                <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
              </Item>
              <Item label="Cidade">
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Item>
            </Pair>
            <Button onClick={handleSave} disabled={saving} variant="hero" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

const Item = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex-1 min-w-0">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);
const Pair = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-2">{children}</div>
);

export default Conta;
