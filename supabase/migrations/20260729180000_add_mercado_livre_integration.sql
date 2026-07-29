-- Integração com Mercado Livre: credenciais OAuth (linha única) e vínculo produto <-> anúncio
CREATE TABLE IF NOT EXISTS public.ml_credentials (
  id TEXT PRIMARY KEY DEFAULT 'default',
  ml_user_id TEXT,
  ml_nickname TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ml_credentials ENABLE ROW LEVEL SECURITY;
-- Sem políticas públicas: só acessível via service role (edge functions).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ml_item_id TEXT,
  ADD COLUMN IF NOT EXISTS ml_permalink TEXT,
  ADD COLUMN IF NOT EXISTS ml_synced_at TIMESTAMPTZ;
