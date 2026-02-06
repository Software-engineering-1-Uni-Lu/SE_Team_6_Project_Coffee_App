-- Add payment_intent_id column for payment integration
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT UNIQUE;

-- Create index for looking up orders by payment intent
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON public.orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;

COMMENT ON COLUMN public.orders.payment_intent_id IS 'Stripe payment intent ID for card/digital wallet payments. Used for idempotent webhook handling.';
