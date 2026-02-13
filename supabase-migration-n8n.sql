-- ============================================
-- BizPulse — n8n Integration Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  starred BOOLEAN DEFAULT false,
  total_spent NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'n8n', 'api')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. INVOICE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) GENERATED ALWAYS AS (qty * rate) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. API KEYS TABLE (for n8n authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,        -- first 8 chars for display (e.g. "bp_live_a1b2...")
  label TEXT NOT NULL DEFAULT 'Default',
  permissions TEXT[] DEFAULT ARRAY['read', 'write'],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. WEBHOOK LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL DEFAULT 'n8n',
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients"
  ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- Invoice Items (access through invoice ownership)
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));
CREATE POLICY "Users can update own invoice items"
  ON public.invoice_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own invoice items"
  ON public.invoice_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));

-- API Keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own api keys"
  ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own api keys"
  ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own api keys"
  ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

-- Webhook Logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook logs"
  ON public.webhook_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- API KEY VERIFICATION FUNCTION
-- Used by Edge Functions to validate API keys
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_api_key(api_key TEXT)
RETURNS TABLE(user_id UUID, permissions TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT ak.user_id, ak.permissions
  FROM public.api_keys ak
  WHERE ak.key_hash = encode(digest(api_key, 'sha256'), 'hex')
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now());

  -- Update last_used_at
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = encode(digest(api_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUTO-GENERATE INVOICE NUMBER
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE user_id = p_user_id;

  RETURN 'INV-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON public.webhook_logs(user_id);

-- ============================================
-- ENABLE pgcrypto extension (for digest function)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
