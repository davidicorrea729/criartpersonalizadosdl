-- Estoque de produtos + função para desconto atômico ao confirmar pagamento
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id UUID, p_qty INTEGER)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.products
  SET stock = GREATEST(stock - p_qty, 0)
  WHERE id = p_product_id;
$$;
