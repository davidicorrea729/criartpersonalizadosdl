import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartCustomization {
  // Bordados
  size?: string;
  towelColor?: string;
  font?: string;
  text?: string;
  threadColor?: string;
  // 3D
  material?: string;
  printColor?: string;
  quality?: string;
  scale?: number;
  stlFileName?: string;
  // comum
  notes?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  category: "bordados" | "impressao3d";
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  customization: CartCustomization;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, id: crypto.randomUUID() }],
        })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        })),
      clear: () => set({ items: [] }),
      total: () =>
        get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "atelier-cart" }
  )
);

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
