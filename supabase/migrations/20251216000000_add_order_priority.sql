-- Add priority field to orders table
-- Priority levels: low, normal, high, urgent
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal' 
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Create index for priority sorting
CREATE INDEX IF NOT EXISTS idx_orders_priority ON public.orders(priority);

-- Add comment
COMMENT ON COLUMN public.orders.priority IS 'Order priority level: low, normal, high, urgent';

