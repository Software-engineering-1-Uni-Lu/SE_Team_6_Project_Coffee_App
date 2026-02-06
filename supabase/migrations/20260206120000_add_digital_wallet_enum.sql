-- Add 'digital_wallet' to the payment_method enum type
-- This is required to support Apple Pay / Google Pay integration
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'digital_wallet';
