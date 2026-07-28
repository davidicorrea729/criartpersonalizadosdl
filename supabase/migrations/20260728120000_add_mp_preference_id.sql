-- Guarda o id da preferência de Checkout Pro (cartão/outros) gerada para o pedido
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT;
