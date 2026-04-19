import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Bordados from "./pages/Bordados";
import BordadoDetalhe from "./pages/BordadoDetalhe";
import Impressao3D from "./pages/Impressao3D";
import Print3DDetalhe from "./pages/Print3DDetalhe";
import Carrinho from "./pages/Carrinho";
import Conta from "./pages/Conta";
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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/bordados" element={<Bordados />} />
          <Route path="/bordados/:id" element={<BordadoDetalhe />} />
          <Route path="/impressao3d" element={<Impressao3D />} />
          <Route path="/impressao3d/upload" element={<Print3DDetalhe uploadMode />} />
          <Route path="/impressao3d/:id" element={<Print3DDetalhe />} />
          <Route path="/carrinho" element={<Carrinho />} />
          <Route path="/conta" element={<Conta />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
