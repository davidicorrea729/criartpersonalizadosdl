import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail } from "lucide-react";

const WHATSAPP = "5511999999999"; // ajuste com o número real

const Contato = () => (
  <AppShell title="Contato" showBack>
    <div className="px-5 pt-6 space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Fale com a gente</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tire dúvidas, peça orçamento ou envie ideias.
        </p>
      </div>

      <a
        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
          "Olá! Vim pelo app e gostaria de tirar uma dúvida."
        )}`}
        target="_blank"
        rel="noreferrer"
        className="block"
      >
        <Button variant="warm" size="xl" className="w-full">
          <MessageCircle className="mr-2 h-5 w-5" />
          WhatsApp
        </Button>
      </a>

      <div className="grid grid-cols-1 gap-3">
        <InfoCard icon={<Phone className="h-5 w-5" />} title="Telefone" value="(11) 99999-9999" />
        <InfoCard icon={<Mail className="h-5 w-5" />} title="Email" value="contato@atelier.com" />
      </div>

      <div className="bg-secondary-soft rounded-2xl p-5 mt-2">
        <p className="text-xs uppercase tracking-widest text-secondary font-bold">
          Chat interno
        </p>
        <p className="text-sm mt-1">
          Em breve você poderá conversar diretamente conosco pelo app.
        </p>
      </div>
    </div>
  </AppShell>
);

const InfoCard = ({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) => (
  <div className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-soft">
    <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
      {icon}
    </span>
    <div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  </div>
);

export default Contato;
