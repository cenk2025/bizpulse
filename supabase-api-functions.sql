-- ============================================
-- BizPulse — API Functions for n8n Integration
-- These are Supabase Database Functions callable
-- via PostgREST RPC: POST /rest/v1/rpc/function_name
-- Run this in the Supabase SQL Editor AFTER running
-- supabase-migration-n8n.sql
-- ============================================

-- ============================================
-- 1. API: CREATE INVOICE (from n8n or API)
-- ============================================
CREATE OR REPLACE FUNCTION public.api_create_invoice(
  p_api_key TEXT,
  p_client_name TEXT,
  p_client_email TEXT DEFAULT NULL,
  p_due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  p_currency TEXT DEFAULT 'USD',
  p_status TEXT DEFAULT 'draft',
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_permissions TEXT[];
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_total NUMERIC(12,2) := 0;
  v_item JSONB;
  v_client_id UUID;
BEGIN
  -- Verify API key
  SELECT ak.user_id, ak.permissions INTO v_user_id, v_permissions
  FROM public.verify_api_key(p_api_key) ak;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired API key', 'status', 401);
  END IF;

  IF NOT ('write' = ANY(v_permissions)) THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions', 'status', 403);
  END IF;

  -- Find or create client
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE user_id = v_user_id AND LOWER(name) = LOWER(p_client_name)
  LIMIT 1;

  IF v_client_id IS NULL AND p_client_name IS NOT NULL THEN
    INSERT INTO public.clients (user_id, name, email)
    VALUES (v_user_id, p_client_name, p_client_email)
    RETURNING id INTO v_client_id;
  END IF;

  -- Generate invoice number
  v_invoice_number := public.generate_invoice_number(v_user_id);

  -- Calculate total from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + (COALESCE((v_item->>'qty')::INTEGER, 1) * COALESCE((v_item->>'rate')::NUMERIC, 0));
  END LOOP;

  -- Create invoice
  INSERT INTO public.invoices (user_id, invoice_number, client_id, client_name, client_email, due_date, amount, currency, status, notes, source)
  VALUES (v_user_id, v_invoice_number, v_client_id, p_client_name, p_client_email, p_due_date, v_total, p_currency, p_status, p_notes, 'n8n')
  RETURNING id INTO v_invoice_id;

  -- Create invoice items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.invoice_items (invoice_id, description, qty, rate, sort_order)
    VALUES (
      v_invoice_id,
      COALESCE(v_item->>'description', v_item->>'desc', 'Item'),
      COALESCE((v_item->>'qty')::INTEGER, 1),
      COALESCE((v_item->>'rate')::NUMERIC, 0),
      COALESCE((v_item->>'sort_order')::INTEGER, 0)
    );
  END LOOP;

  -- Log webhook
  INSERT INTO public.webhook_logs (user_id, source, event_type, payload, status)
  VALUES (v_user_id, 'n8n', 'invoice.created', jsonb_build_object(
    'invoice_number', v_invoice_number,
    'client', p_client_name,
    'amount', v_total,
    'currency', p_currency
  ), 'processed');

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'amount', v_total,
    'currency', p_currency,
    'status', p_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. API: LIST INVOICES
-- ============================================
CREATE OR REPLACE FUNCTION public.api_list_invoices(
  p_api_key TEXT,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_permissions TEXT[];
  v_result JSONB;
BEGIN
  SELECT ak.user_id, ak.permissions INTO v_user_id, v_permissions
  FROM public.verify_api_key(p_api_key) ak;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired API key', 'status', 401);
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'invoices', COALESCE(jsonb_agg(inv), '[]'::JSONB),
    'total', (SELECT COUNT(*) FROM public.invoices WHERE user_id = v_user_id AND (p_status IS NULL OR status = p_status))
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', i.id,
      'invoice_number', i.invoice_number,
      'client_name', i.client_name,
      'client_email', i.client_email,
      'date', i.date,
      'due_date', i.due_date,
      'amount', i.amount,
      'currency', i.currency,
      'status', i.status,
      'source', i.source,
      'created_at', i.created_at,
      'items', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'description', ii.description,
          'qty', ii.qty,
          'rate', ii.rate,
          'amount', ii.amount
        ) ORDER BY ii.sort_order), '[]'::JSONB)
        FROM public.invoice_items ii WHERE ii.invoice_id = i.id
      )
    ) AS inv
    FROM public.invoices i
    WHERE i.user_id = v_user_id
      AND (p_status IS NULL OR i.status = p_status)
    ORDER BY i.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. API: UPDATE INVOICE STATUS
-- ============================================
CREATE OR REPLACE FUNCTION public.api_update_invoice_status(
  p_api_key TEXT,
  p_invoice_id UUID,
  p_status TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_permissions TEXT[];
  v_invoice_number TEXT;
BEGIN
  SELECT ak.user_id, ak.permissions INTO v_user_id, v_permissions
  FROM public.verify_api_key(p_api_key) ak;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired API key', 'status', 401);
  END IF;

  IF NOT ('write' = ANY(v_permissions)) THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions', 'status', 403);
  END IF;

  UPDATE public.invoices
  SET status = p_status
  WHERE id = p_invoice_id AND user_id = v_user_id
  RETURNING invoice_number INTO v_invoice_number;

  IF v_invoice_number IS NULL THEN
    RETURN jsonb_build_object('error', 'Invoice not found', 'status', 404);
  END IF;

  -- Log
  INSERT INTO public.webhook_logs (user_id, source, event_type, payload, status)
  VALUES (v_user_id, 'n8n', 'invoice.status_updated', jsonb_build_object(
    'invoice_id', p_invoice_id,
    'invoice_number', v_invoice_number,
    'new_status', p_status
  ), 'processed');

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'invoice_number', v_invoice_number,
    'status', p_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. API: LIST CLIENTS
-- ============================================
CREATE OR REPLACE FUNCTION public.api_list_clients(
  p_api_key TEXT,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_permissions TEXT[];
  v_result JSONB;
BEGIN
  SELECT ak.user_id, ak.permissions INTO v_user_id, v_permissions
  FROM public.verify_api_key(p_api_key) ak;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired API key', 'status', 401);
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'clients', COALESCE(jsonb_agg(c), '[]'::JSONB),
    'total', (SELECT COUNT(*) FROM public.clients WHERE user_id = v_user_id AND (p_status IS NULL OR status = p_status))
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', cl.id,
      'name', cl.name,
      'email', cl.email,
      'phone', cl.phone,
      'company', cl.company,
      'location', cl.location,
      'status', cl.status,
      'starred', cl.starred,
      'total_spent', cl.total_spent,
      'created_at', cl.created_at
    ) AS c
    FROM public.clients cl
    WHERE cl.user_id = v_user_id
      AND (p_status IS NULL OR cl.status = p_status)
    ORDER BY cl.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. API: CREATE CLIENT
-- ============================================
CREATE OR REPLACE FUNCTION public.api_create_client(
  p_api_key TEXT,
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_permissions TEXT[];
  v_client_id UUID;
BEGIN
  SELECT ak.user_id, ak.permissions INTO v_user_id, v_permissions
  FROM public.verify_api_key(p_api_key) ak;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired API key', 'status', 401);
  END IF;

  IF NOT ('write' = ANY(v_permissions)) THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions', 'status', 403);
  END IF;

  INSERT INTO public.clients (user_id, name, email, phone, company, location, notes)
  VALUES (v_user_id, p_name, p_email, p_phone, p_company, p_location, p_notes)
  RETURNING id INTO v_client_id;

  -- Log
  INSERT INTO public.webhook_logs (user_id, source, event_type, payload, status)
  VALUES (v_user_id, 'n8n', 'client.created', jsonb_build_object(
    'client_id', v_client_id,
    'name', p_name,
    'email', p_email
  ), 'processed');

  RETURN jsonb_build_object(
    'success', true,
    'client_id', v_client_id,
    'name', p_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. API: GENERAL WEBHOOK HANDLER
--    Receives any payload from n8n
-- ============================================
CREATE OR REPLACE FUNCTION public.api_webhook(
  p_api_key TEXT,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_permissions TEXT[];
  v_log_id UUID;
BEGIN
  SELECT ak.user_id, ak.permissions INTO v_user_id, v_permissions
  FROM public.verify_api_key(p_api_key) ak;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired API key', 'status', 401);
  END IF;

  INSERT INTO public.webhook_logs (user_id, source, event_type, payload, status)
  VALUES (v_user_id, 'n8n', p_event_type, p_payload, 'received')
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'event_type', p_event_type,
    'message', 'Webhook received and logged'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. API: GENERATE API KEY
--    Called from the UI to create a new key
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_api_key(
  p_label TEXT DEFAULT 'Default'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
  v_key_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated', 'status', 401);
  END IF;

  -- Generate a random API key: bp_live_ + 32 random hex chars
  v_raw_key := 'bp_live_' || encode(gen_random_bytes(16), 'hex');
  v_key_hash := encode(digest(v_raw_key, 'sha256'), 'hex');
  v_key_prefix := substring(v_raw_key from 1 for 16) || '...';

  INSERT INTO public.api_keys (user_id, key_hash, key_prefix, label)
  VALUES (v_user_id, v_key_hash, v_key_prefix, p_label)
  RETURNING id INTO v_key_id;

  -- Return the raw key ONLY ONCE (it cannot be retrieved later)
  RETURN jsonb_build_object(
    'success', true,
    'key_id', v_key_id,
    'api_key', v_raw_key,
    'prefix', v_key_prefix,
    'label', p_label,
    'warning', 'Save this key now — it will not be shown again!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. API: REVOKE API KEY
-- ============================================
CREATE OR REPLACE FUNCTION public.revoke_api_key(
  p_key_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated', 'status', 401);
  END IF;

  DELETE FROM public.api_keys
  WHERE id = p_key_id AND user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'API key revoked');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. API: DAILY SUMMARY (for reports)
-- Returns counts & totals by status
-- ============================================
CREATE OR REPLACE FUNCTION public.api_daily_summary(
  p_api_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_permissions TEXT[];
  v_result JSONB;
BEGIN
  SELECT ak.user_id, ak.permissions INTO v_user_id, v_permissions
  FROM public.verify_api_key(p_api_key) ak;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired API key', 'status', 401);
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'total_invoices', (SELECT COUNT(*) FROM public.invoices WHERE user_id = v_user_id),
    'total_amount', COALESCE((SELECT SUM(amount) FROM public.invoices WHERE user_id = v_user_id), 0),
    'paid_count', (SELECT COUNT(*) FROM public.invoices WHERE user_id = v_user_id AND status = 'paid'),
    'paid_amount', COALESCE((SELECT SUM(amount) FROM public.invoices WHERE user_id = v_user_id AND status = 'paid'), 0),
    'pending_count', (SELECT COUNT(*) FROM public.invoices WHERE user_id = v_user_id AND status IN ('pending', 'sent')),
    'pending_amount', COALESCE((SELECT SUM(amount) FROM public.invoices WHERE user_id = v_user_id AND status IN ('pending', 'sent')), 0),
    'overdue_count', (SELECT COUNT(*) FROM public.invoices WHERE user_id = v_user_id AND status = 'overdue'),
    'overdue_amount', COALESCE((SELECT SUM(amount) FROM public.invoices WHERE user_id = v_user_id AND status = 'overdue'), 0),
    'today_created', (SELECT COUNT(*) FROM public.invoices WHERE user_id = v_user_id AND date = CURRENT_DATE),
    'today_amount', COALESCE((SELECT SUM(amount) FROM public.invoices WHERE user_id = v_user_id AND date = CURRENT_DATE), 0),
    'overdue_invoices', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'invoice_number', invoice_number,
        'client_name', client_name,
        'amount', amount,
        'currency', currency,
        'due_date', due_date,
        'days_overdue', (CURRENT_DATE - due_date)
      ) ORDER BY due_date ASC), '[]'::JSONB)
      FROM public.invoices
      WHERE user_id = v_user_id AND status = 'overdue'
    ),
    'total_clients', (SELECT COUNT(*) FROM public.clients WHERE user_id = v_user_id AND status = 'active')
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. AUTO MARK OVERDUE
-- Marks pending/sent invoices as overdue
-- when due_date has passed. Call from n8n cron.
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_mark_overdue(
  p_api_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_permissions TEXT[];
  v_count INTEGER;
BEGIN
  SELECT ak.user_id, ak.permissions INTO v_user_id, v_permissions
  FROM public.verify_api_key(p_api_key) ak;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired API key', 'status', 401);
  END IF;

  IF NOT ('write' = ANY(v_permissions)) THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions', 'status', 403);
  END IF;

  UPDATE public.invoices
  SET status = 'overdue'
  WHERE user_id = v_user_id
    AND status IN ('pending', 'sent')
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'marked_overdue', v_count,
    'message', v_count || ' invoice(s) marked as overdue'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE REALTIME for live updates in UI
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;

