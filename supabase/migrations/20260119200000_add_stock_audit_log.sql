-- Create stock_audit_log table for tracking all stock quantity changes
-- Part of CSA-214: Modify In-Stock Quantity feature

-- Create enum type for stock adjustment reasons
CREATE TYPE stock_adjustment_reason AS ENUM (
  'Restock',
  'Waste',
  'Correction',
  'Manual Adjustment'
);

-- Create stock_audit_log table
CREATE TABLE IF NOT EXISTS public.stock_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_quantity NUMERIC NOT NULL,
  new_quantity NUMERIC NOT NULL CHECK (new_quantity >= 0),
  reason stock_adjustment_reason NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.stock_audit_log IS 'Audit trail for all stock quantity changes on items';
COMMENT ON COLUMN public.stock_audit_log.item_id IS 'Reference to the item whose stock was adjusted';
COMMENT ON COLUMN public.stock_audit_log.user_id IS 'Reference to the manager/admin who made the change';
COMMENT ON COLUMN public.stock_audit_log.old_quantity IS 'Stock quantity before the change';
COMMENT ON COLUMN public.stock_audit_log.new_quantity IS 'Stock quantity after the change';
COMMENT ON COLUMN public.stock_audit_log.reason IS 'Reason for the stock adjustment';
COMMENT ON COLUMN public.stock_audit_log.note IS 'Optional note explaining the adjustment (max 500 chars)';
COMMENT ON COLUMN public.stock_audit_log.created_at IS 'Timestamp when the change was made';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_stock_audit_item ON public.stock_audit_log(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_user ON public.stock_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_created ON public.stock_audit_log(created_at DESC);

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_stock_audit_item_created ON public.stock_audit_log(item_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.stock_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Managers and admins can view all audit logs
CREATE POLICY "Managers and admins can view stock audit logs"
  ON public.stock_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('manager', 'admin')
    )
  );

-- RLS Policy: System can insert audit logs (via service role or authenticated users with manager/admin role)
-- Note: Audit logs are inserted by the API, not directly by users
CREATE POLICY "System can insert stock audit logs"
  ON public.stock_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('manager', 'admin')
    )
  );

-- Prevent updates and deletes (audit logs are immutable)
-- No UPDATE or DELETE policies needed - RLS will deny by default

-- Grant permissions
GRANT SELECT ON public.stock_audit_log TO authenticated;
GRANT INSERT ON public.stock_audit_log TO authenticated;

-- Create function to get stock change history for an item
CREATE OR REPLACE FUNCTION get_item_stock_history(
  p_item_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  old_quantity NUMERIC,
  new_quantity NUMERIC,
  reason stock_adjustment_reason,
  note TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id,
    sal.user_id,
    p.full_name as user_name,
    sal.old_quantity,
    sal.new_quantity,
    sal.reason,
    sal.note,
    sal.created_at
  FROM public.stock_audit_log sal
  JOIN public.profiles p ON p.id = sal.user_id
  WHERE sal.item_id = p_item_id
  ORDER BY sal.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION get_item_stock_history(UUID, INTEGER, INTEGER) TO authenticated;
