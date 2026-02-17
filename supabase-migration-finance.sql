-- ============================================
-- BizPulse — Income/Expense Separation Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Create ENUM type for invoice types
CREATE TYPE invoice_type_enum AS ENUM ('sales', 'purchase');

-- 2. Add invoice_type column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS invoice_type invoice_type_enum DEFAULT 'sales';

-- 3. Add index on invoice_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(invoice_type);

-- 4. Update RLS policies (optional but good practice)
-- Ensure users can select based on type efficiently
-- (Existing policies likely cover this as they select * based on user_id)
