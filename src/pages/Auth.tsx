import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Lock, User as UserIcon, Phone } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").max(100),
});

const signupSchema = loginSchema.extend({
  full_name: z.string().trim().min(2, "Informe seu nome").max(100),
  phone: z.string().trim().min(8, "Informe um telefone válido").max(20),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!authLoading && user) navigate("/conta", { replace: true });
  }, [user, authLoading, navigate]);

  const handleLogin = async () => {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      return toast.error(parsed.error.errors[0].message);
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "Email ou senha inválidos" : error.message);
    toast.success("Bem-vindo de volta!");
    navigate("/conta", { replace: true });
  };

  const handleSignup = async () => {
    const parsed = signupSchema.safeParse({ email, password, full_name: fullName, phone });
    if (!parsed.success) {
      return toast.error(parsed.error.errors[0].message);
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/conta`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
        },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) return toast.error("Este email já está cadastrado");
      return toast.error(error.message);
    }
    toast.success("Conta criada! Você já está logado.");
    navigate("/conta", { replace: true });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/conta`,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Falha ao entrar com Google");
    }
  };

  return (
    <AppShell title="Entrar" showBack>
      <div className="px-5 pt-6 pb-10 max-w-sm mx-auto">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full mb-5">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-3">
            <Field icon={<Mail className="h-4 w-4" />} label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </Field>
            <Field icon={<Lock className="h-4 w-4" />} label="Senha">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </Field>
            <Button onClick={handleLogin} disabled={loading} variant="hero" size="lg" className="w-full mt-2">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3">
            <Field icon={<UserIcon className="h-4 w-4" />} label="Nome completo">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
            </Field>
            <Field icon={<Phone className="h-4 w-4" />} label="Telefone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </Field>
            <Field icon={<Mail className="h-4 w-4" />} label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </Field>
            <Field icon={<Lock className="h-4 w-4" />} label="Senha">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </Field>
            <Button onClick={handleSignup} disabled={loading} variant="hero" size="lg" className="w-full mt-2">
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button onClick={handleGoogle} disabled={loading} variant="outline" size="lg" className="w-full">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar com Google
        </Button>
      </div>
    </AppShell>
  );
};

const Field = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div>
    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
      <span className="text-primary">{icon}</span> {label}
    </Label>
    {children}
  </div>
);

export default Auth;
