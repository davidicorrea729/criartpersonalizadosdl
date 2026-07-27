import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OrderStatus = "pendente" | "em_producao" | "enviado" | "concluido" | "cancelado";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  category: string;
  name: string;
  image_url: string;
  unit_price: number;
  quantity: number;
  customization: Record<string, any>;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  notes: string;
  payment_method: string;
  payment_status: string;
  pix_expires_at: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendente: "Pendente",
  em_producao: "Em produção",
  enviado: "Enviado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_producao: "bg-secondary/20 text-secondary-foreground",
  enviado: "bg-primary/20 text-primary",
  concluido: "bg-green-500/20 text-green-700 dark:text-green-400",
  cancelado: "bg-destructive/20 text-destructive",
};

export const useMyOrders = (userId: string | undefined) =>
  useQuery({
    queryKey: ["my-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

export const useAllOrders = (enabled: boolean) =>
  useQuery({
    queryKey: ["all-orders"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });
