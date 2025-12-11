-- Create refund_requests table for customer-initiated refund requests
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('quality_issue', 'wrong_order', 'missing_items', 'cold_food', 'late_delivery', 'not_as_described', 'other')),
  description TEXT NOT NULL,
  requested_amount_cents INTEGER, -- NULL means full refund requested
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON public.refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_customer_id ON public.refund_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON public.refund_requests(created_at);

-- Add comments
COMMENT ON TABLE public.refund_requests IS 'Customer-initiated refund requests';
COMMENT ON COLUMN public.refund_requests.request_type IS 'Type of issue: quality_issue, wrong_order, missing_items, cold_food, late_delivery, not_as_described, other';
COMMENT ON COLUMN public.refund_requests.status IS 'Request status: pending (awaiting review), approved (approved but not processed), rejected, processed (refund completed)';
COMMENT ON COLUMN public.refund_requests.requested_amount_cents IS 'NULL means full refund, otherwise specific amount';

-- RLS Policies
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view their own refund requests
CREATE POLICY "Customers can view own refund requests"
  ON public.refund_requests
  FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can create refund requests for their own orders
CREATE POLICY "Customers can create refund requests"
  ON public.refund_requests
  FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id
        AND customer_id = auth.uid()
        AND payment_status = 'paid'
    )
  );

-- Admins can view all refund requests
CREATE POLICY "Admins can view all refund requests"
  ON public.refund_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update refund requests (approve/reject/add notes)
CREATE POLICY "Admins can update refund requests"
  ON public.refund_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_refund_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_refund_request_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.refund_requests TO authenticated;
GRANT UPDATE ON public.refund_requests TO authenticated;

