-- Create refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  refund_type TEXT NOT NULL CHECK (refund_type IN ('full', 'partial', 'comp')),
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  processed_by UUID NOT NULL REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit log table for financial adjustments
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'order', 'refund', 'payment', 'loyalty', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'refunded', 'comp_applied', etc.
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_email TEXT,
  changes JSONB, -- Store before/after values
  metadata JSONB, -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_processed_by ON public.refunds(processed_by);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

-- Add refund status to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER DEFAULT 0;

-- Add comments
COMMENT ON TABLE public.refunds IS 'Tracks all refunds and comps issued for orders';
COMMENT ON TABLE public.audit_log IS 'Audit trail for all financial and sensitive operations';
COMMENT ON COLUMN public.refunds.refund_type IS 'Type of refund: full (entire order), partial (some items), comp (courtesy adjustment)';
COMMENT ON COLUMN public.refunds.amount_cents IS 'Amount refunded/comped in cents';
COMMENT ON COLUMN public.audit_log.changes IS 'JSON object with before and after values';

-- RLS Policies for refunds
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Admins can view all refunds
CREATE POLICY "Admins can view refunds"
  ON public.refunds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert refunds
CREATE POLICY "Admins can create refunds"
  ON public.refunds
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert audit logs
CREATE POLICY "System can create audit logs"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (true);

-- Function to process refund and create audit log
CREATE OR REPLACE FUNCTION process_refund(
  p_order_id UUID,
  p_refund_type TEXT,
  p_amount_cents INTEGER,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_refund_id UUID;
  v_order RECORD;
  v_user_id UUID;
  v_user_email TEXT;
  v_points_to_refund INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can process refunds';
  END IF;
  
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Validate refund amount
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;
  
  IF p_amount_cents > v_order.total_cents THEN
    RAISE EXCEPTION 'Refund amount cannot exceed order total';
  END IF;
  
  -- Insert refund record
  INSERT INTO public.refunds (
    order_id,
    refund_type,
    amount_cents,
    reason,
    notes,
    processed_by
  ) VALUES (
    p_order_id,
    p_refund_type,
    p_amount_cents,
    p_reason,
    p_notes,
    v_user_id
  ) RETURNING id INTO v_refund_id;
  
  -- Update order refund status
  UPDATE public.orders
  SET 
    refunded = (p_refund_type = 'full' OR (refund_amount_cents + p_amount_cents >= total_cents)),
    refund_amount_cents = refund_amount_cents + p_amount_cents,
    status = CASE 
      WHEN p_refund_type = 'full' OR (refund_amount_cents + p_amount_cents >= total_cents) THEN 'cancelled'
      ELSE status
    END
  WHERE id = p_order_id;
  
  -- Refund loyalty points if customer used points
  IF v_order.customer_id IS NOT NULL AND v_order.points_redeemed > 0 THEN
    -- Calculate proportional points to refund
    IF p_refund_type = 'full' THEN
      v_points_to_refund := v_order.points_redeemed;
    ELSE
      -- Proportional refund
      v_points_to_refund := ROUND((p_amount_cents::NUMERIC / v_order.total_cents::NUMERIC) * v_order.points_redeemed);
    END IF;
    
    IF v_points_to_refund > 0 THEN
      -- Add points back to customer
      INSERT INTO public.loyalty_ledger (customer_id, points, description)
      VALUES (v_order.customer_id, v_points_to_refund, 'Refund for order #' || SUBSTRING(p_order_id::TEXT, 1, 8));
    END IF;
  END IF;
  
  -- Create audit log entry
  INSERT INTO public.audit_log (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_email,
    changes,
    metadata
  ) VALUES (
    'order',
    p_order_id,
    CASE 
      WHEN p_refund_type = 'comp' THEN 'comp_applied'
      WHEN p_refund_type = 'full' THEN 'full_refund'
      ELSE 'partial_refund'
    END,
    v_user_id,
    v_user_email,
    jsonb_build_object(
      'before', jsonb_build_object(
        'refunded', v_order.refunded,
        'refund_amount_cents', v_order.refund_amount_cents
      ),
      'after', jsonb_build_object(
        'refunded', (p_refund_type = 'full' OR (v_order.refund_amount_cents + p_amount_cents >= v_order.total_cents)),
        'refund_amount_cents', v_order.refund_amount_cents + p_amount_cents
      )
    ),
    jsonb_build_object(
      'refund_id', v_refund_id,
      'refund_type', p_refund_type,
      'amount_cents', p_amount_cents,
      'reason', p_reason,
      'notes', p_notes,
      'points_refunded', v_points_to_refund
    )
  );
  
  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.refunds TO authenticated;
GRANT INSERT ON public.refunds TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION process_refund TO authenticated;

