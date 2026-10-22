-- ============================================
-- BizPulse — Security & data-integrity fixes
-- Run this in the Supabase SQL Editor AFTER all earlier migrations
-- (schema → n8n → api-functions → settings → finnish → finance → calendar).
-- Safe to run more than once.
-- ============================================

-- ============================================
-- 1. APPOINTMENTS: reconcile the two table definitions
--    supabase-schema.sql used (client TEXT, time TEXT);
--    the app expects (client_name TEXT, time TIME, updated_at).
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_name') THEN
    ALTER TABLE public.appointments RENAME COLUMN client TO client_name;
  END IF;

  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'time') = 'text' THEN
    ALTER TABLE public.appointments ALTER COLUMN time TYPE TIME USING time::TIME;
  END IF;
END $$;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS appointments_updated_at ON public.appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 2. INVOICE NUMBERS
--    generate_invoice_number(p_user_id) was SECURITY DEFINER and callable by
--    anyone (incl. anon) for ANY user id. It is now internal-only; the UI
--    calls next_invoice_number(), which always uses auth.uid().
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Serialize per user so concurrent calls in one transaction can't get the same number
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE user_id = p_user_id;

  RETURN 'INV-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  RETURN public.generate_invoice_number(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;

-- Unique invoice number per user (the UI retries on conflict).
-- Skipped with a warning if duplicates already exist — fix those first:
--   SELECT user_id, invoice_number, COUNT(*) FROM public.invoices
--   GROUP BY 1, 2 HAVING COUNT(*) > 1;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.invoices GROUP BY user_id, invoice_number HAVING COUNT(*) > 1) THEN
    RAISE WARNING 'Duplicate invoice numbers exist — unique index NOT created. Resolve duplicates and re-run this migration.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_invoice_number_key
      ON public.invoices(user_id, invoice_number);
  END IF;
END $$;

-- ============================================
-- 3. INTERNAL FUNCTIONS: not callable via the public API
--    (the api_* functions still use them — they run as the owner)
-- ============================================
REVOKE EXECUTE ON FUNCTION public.verify_api_key(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============================================
-- 4. FIXED search_path ON ALL BIZPULSE FUNCTIONS
--    (SECURITY DEFINER without it can be hijacked via search_path;
--    pgcrypto lives in the "extensions" schema on Supabase)
-- ============================================
DO $$
DECLARE
  f REGPROCEDURE;
BEGIN
  FOR f IN
    SELECT p.oid::REGPROCEDURE
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_new_user', 'verify_api_key', 'generate_invoice_number', 'update_updated_at',
        'api_create_invoice', 'api_list_invoices', 'api_update_invoice_status',
        'api_list_clients', 'api_create_client', 'api_webhook',
        'generate_api_key', 'revoke_api_key', 'api_daily_summary', 'auto_mark_overdue'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', f);
  END LOOP;
END $$;

-- ============================================
-- 5. clients.total_spent — keep in sync with paid sales invoices
--    (runs as the invoking user, so RLS still applies)
-- ============================================
CREATE OR REPLACE FUNCTION public.refresh_client_total_spent(p_client_id UUID)
RETURNS VOID AS $$
BEGIN
  IF p_client_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.clients c
  SET total_spent = COALESCE((
    SELECT SUM(i.amount)
    FROM public.invoices i
    WHERE i.client_id = p_client_id
      AND i.user_id = c.user_id
      AND i.status = 'paid'
      AND COALESCE(i.invoice_type, 'sales') = 'sales'
  ), 0)
  WHERE c.id = p_client_id;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

-- authenticated keeps EXECUTE: the trigger below calls this as the invoking user
-- (it is SECURITY INVOKER, so RLS limits it to the user's own clients)
REVOKE EXECUTE ON FUNCTION public.refresh_client_total_spent(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_client_total_spent(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.invoices_sync_client_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_client_total_spent(NEW.client_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_client_total_spent(OLD.client_id);
  ELSE
    PERFORM public.refresh_client_total_spent(OLD.client_id);
    IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      PERFORM public.refresh_client_total_spent(NEW.client_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

REVOKE EXECUTE ON FUNCTION public.invoices_sync_client_total() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS invoices_sync_client_total ON public.invoices;
CREATE TRIGGER invoices_sync_client_total
  AFTER INSERT OR DELETE OR UPDATE OF amount, status, client_id, invoice_type ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoices_sync_client_total();

-- Back-fill existing totals
UPDATE public.clients c
SET total_spent = COALESCE((
  SELECT SUM(i.amount)
  FROM public.invoices i
  WHERE i.client_id = c.id
    AND i.user_id = c.user_id
    AND i.status = 'paid'
    AND COALESCE(i.invoice_type, 'sales') = 'sales'
), 0);
