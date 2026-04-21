import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Bordados from "./pages/Bordados";
import BordadoDetalhe from "./pages/BordadoDetalhe";
import Impressao3D from "./pages/Impressao3D";
import Print3DDetalhe from "./pages/Print3DDetalhe";
import Carrinho from "./pages/Carrinho";
import Conta from "./pages/Conta";
import Auth from "./pages/Auth";
import Pedidos from "./pages/Pedidos";
import Pagamento from "./pages/Pagamento";
import Contato from "./pages/Contato";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/bordados" element={<Bordados />} />
            <Route path="/bordados/:id" element={<BordadoDetalhe />} />
            <Route path="/impressao3d" element={<Impressao3D />} />
            <Route path="/impressao3d/upload" element={<Print3DDetalhe uploadMode />} />
            <Route path="/impressao3d/:id" element={<Print3DDetalhe />} />
            <Route path="/carrinho" element={<Carrinho />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/conta" element={<Conta />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/pagamento/:orderId" element={<Pagamento />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
