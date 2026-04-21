-- Adiciona colunas PIX em orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS pix_qr_code text,
  ADD COLUMN IF NOT EXISTS pix_qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS pix_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON public.orders(mp_payment_id);

-- Habilita realtime para acompanhar mudança de payment_status na tela de pagamento
ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;
END$$;

-- Trigger updated_at em orders (idempotente)
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();