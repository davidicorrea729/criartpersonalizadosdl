-- Guarda a categoria do Mercado Livre escolhida manualmente para cada produto
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ml_category_id TEXT,
  ADD COLUMN IF NOT EXISTS ml_category_name TEXT;
