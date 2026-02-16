-- ============================================
-- BizPulse — Finnish Invoice Fields Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD FINNISH FIELDS TO INVOICES
-- ============================================
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS bic TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS reference_number TEXT;  -- Viitenumero
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_percent NUMERIC(5,2) DEFAULT 25.5;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payee_name TEXT;        -- Saaja
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payee_business_id TEXT; -- Y-tunnus

-- Update default currency to EUR
ALTER TABLE public.invoices ALTER COLUMN currency SET DEFAULT 'EUR';

-- Add 'scan' to source check constraint
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_source_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_source_check
  CHECK (source IN ('manual', 'n8n', 'api', 'scan'));

-- ============================================
-- 2. ADD FINNISH FIELDS TO CLIENTS
-- ============================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_id TEXT;   -- Y-tunnus
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;

-- ============================================
-- 3. ADD VAT FIELDS TO INVOICE ITEMS
-- ============================================
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS vat_percent NUMERIC(5,2) DEFAULT 25.5;

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_reference_number ON public.invoices(reference_number);
CREATE INDEX IF NOT EXISTS idx_invoices_iban ON public.invoices(iban);
CREATE INDEX IF NOT EXISTS idx_clients_business_id ON public.clients(business_id);
