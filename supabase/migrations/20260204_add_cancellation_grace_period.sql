-- Add configurable cancellation grace period (in minutes) to settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS cancellation_grace_period_minutes INTEGER NOT NULL DEFAULT 5;
