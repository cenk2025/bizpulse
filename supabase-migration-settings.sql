-- ============================================
-- BizPulse — Settings columns migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- Add missing columns to profiles for settings persistence
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_report BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT true;
