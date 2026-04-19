import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/data/catalog";

export interface DBProduct {
  id: string;
  category: Category;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export const useProducts = (category?: Category) => {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at");
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setProducts((data as DBProduct[]) ?? []);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { products, loading, error, refetch };
};

export const useProduct = (id?: string) => {
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setProduct((data as DBProduct) ?? null);
      setLoading(false);
    })();
  }, [id]);

  return { product, loading };
};
