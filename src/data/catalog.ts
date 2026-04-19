import towel1 from "@/assets/towel-1.jpg";
import towel2 from "@/assets/towel-2.jpg";
import towel3 from "@/assets/towel-3.jpg";
import print1 from "@/assets/print-1.jpg";
import print2 from "@/assets/print-2.jpg";
import print3 from "@/assets/print-3.jpg";

export type Category = "bordados" | "impressao3d";

export interface Product {
  id: string;
  category: Category;
  name: string;
  description: string;
  basePrice: number;
  image: string;
}

export const products: Product[] = [
  {
    id: "b1",
    category: "bordados",
    name: "Toalha de Banho Premium",
    description: "Toalha de algodão 100%, alta absorção, perfeita para bordado personalizado.",
    basePrice: 49.9,
    image: towel1,
  },
  {
    id: "b2",
    category: "bordados",
    name: "Toalha de Rosto Clássica",
    description: "Toque macio e durabilidade. Ideal para presentes personalizados.",
    basePrice: 29.9,
    image: towel2,
  },
  {
    id: "b3",
    category: "bordados",
    name: "Jogo de Toalhas Família",
    description: "Conjunto de 3 toalhas com bordado coordenado.",
    basePrice: 119.9,
    image: towel3,
  },
  {
    id: "p1",
    category: "impressao3d",
    name: "Organizador Geométrico",
    description: "Organizador de mesa com design moderno em impressão 3D.",
    basePrice: 39.9,
    image: print1,
  },
  {
    id: "p2",
    category: "impressao3d",
    name: "Vaso Decorativo Honeycomb",
    description: "Vaso com padrão hexagonal, peça de destaque para sua casa.",
    basePrice: 79.9,
    image: print2,
  },
  {
    id: "p3",
    category: "impressao3d",
    name: "Suporte para Celular",
    description: "Suporte minimalista, leve e resistente.",
    basePrice: 24.9,
    image: print3,
  },
];

// ====== Bordados ======
export const towelSizes = [
  { id: "rosto", label: "Rosto (50x80cm)", multiplier: 1 },
  { id: "banho", label: "Banho (70x140cm)", multiplier: 1.6 },
  { id: "praia", label: "Praia (90x160cm)", multiplier: 2.1 },
];

export const towelColors = [
  { id: "branca", label: "Branca", hex: "#FFFFFF" },
  { id: "bege", label: "Bege", hex: "#E8DCC4" },
  { id: "rosa", label: "Rosa", hex: "#F4C2C2" },
  { id: "azul", label: "Azul", hex: "#5B8DEF" },
  { id: "verde", label: "Verde", hex: "#A8C8A0" },
  { id: "preta", label: "Preta", hex: "#1A1A1A" },
];

export const fontOptions = [
  { id: "script", label: "Cursiva Elegante", className: "font-display italic" },
  { id: "serif", label: "Serifada Clássica", className: "font-display" },
  { id: "sans", label: "Sem Serifa Moderna", className: "font-sans font-semibold" },
  { id: "bold", label: "Negrito", className: "font-sans font-bold uppercase tracking-wide" },
];

export const threadColors = [
  { id: "dourado", label: "Dourado", hex: "#C9A227" },
  { id: "prata", label: "Prata", hex: "#B8B8B8" },
  { id: "branco", label: "Branco", hex: "#FFFFFF" },
  { id: "preto", label: "Preto", hex: "#1A1A1A" },
  { id: "vermelho", label: "Vermelho", hex: "#C0392B" },
  { id: "rosa", label: "Rosa", hex: "#E91E63" },
  { id: "azul", label: "Azul", hex: "#2C5DAB" },
];

export const EMBROIDERY_FEE = 18; // taxa fixa por bordado

// ====== Impressão 3D ======
export const materials = [
  { id: "PLA", label: "PLA (padrão)", multiplier: 1 },
  { id: "PETG", label: "PETG (resistente)", multiplier: 1.25 },
  { id: "ABS", label: "ABS (alta dureza)", multiplier: 1.4 },
];

export const qualities = [
  { id: "baixa", label: "Baixa (rápida)", multiplier: 0.85 },
  { id: "media", label: "Média (recomendada)", multiplier: 1 },
  { id: "alta", label: "Alta (detalhada)", multiplier: 1.35 },
];

export const printColors = [
  { id: "preto", label: "Preto", hex: "#1A1A1A" },
  { id: "branco", label: "Branco", hex: "#FFFFFF" },
  { id: "azul", label: "Azul", hex: "#1E3A8A" },
  { id: "vermelho", label: "Vermelho", hex: "#B91C1C" },
  { id: "verde", label: "Verde", hex: "#15803D" },
  { id: "laranja", label: "Laranja", hex: "#EA580C" },
  { id: "cinza", label: "Cinza", hex: "#6B7280" },
];

export const STL_BASE_PRICE = 35; // preço base para um STL personalizado
