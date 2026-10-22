-- ============================================
-- BizPulse — Remove the n8n / external API integration
-- Run this in the Supabase SQL Editor AFTER supabase-migration-security-fixes.sql.
-- Safe to run more than once.
--
-- Drops the public API functions, API keys and webhook logs.
-- Invoices, clients and their data are NOT touched; old invoices created
-- via n8n keep source = 'n8n'.
-- ============================================

-- 1. Public API functions (were callable with the anon key + an API key)
DROP FUNCTION IF EXISTS public.api_create_invoice;
DROP FUNCTION IF EXISTS public.api_list_invoices;
DROP FUNCTION IF EXISTS public.api_update_invoice_status;
DROP FUNCTION IF EXISTS public.api_list_clients;
DROP FUNCTION IF EXISTS public.api_create_client;
DROP FUNCTION IF EXISTS public.api_webhook;
DROP FUNCTION IF EXISTS public.api_daily_summary;
DROP FUNCTION IF EXISTS public.auto_mark_overdue;

-- 2. API key management
DROP FUNCTION IF EXISTS public.generate_api_key;
DROP FUNCTION IF EXISTS public.revoke_api_key;
DROP FUNCTION IF EXISTS public.verify_api_key;

-- 3. Tables used only by the integration
DROP TABLE IF EXISTS public.webhook_logs;
DROP TABLE IF EXISTS public.api_keys;
