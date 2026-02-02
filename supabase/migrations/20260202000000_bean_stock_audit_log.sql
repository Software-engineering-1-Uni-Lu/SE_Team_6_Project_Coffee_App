-- Bean (ingredient) stock audit log for CSA-214 aligned with ingredients model
-- Stock is tracked per ingredient (beans), not per menu item (items).
-- Menu items consume ingredients via item_ingredients; orders deduct from beans.

CREATE TABLE IF NOT EXISTS public.bean_stock_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bean_id UUID NOT NULL REFERENCES public.beans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_quantity NUMERIC NOT NULL,
  new_quantity NUMERIC NOT NULL CHECK (new_quantity >= 0),
  reason stock_adjustment_reason NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bean_stock_audit_log IS 'Audit trail for stock quantity changes on ingredients (beans)';
COMMENT ON COLUMN public.bean_stock_audit_log.bean_id IS 'Reference to the ingredient (bean) whose stock was adjusted';

CREATE INDEX IF NOT EXISTS idx_bean_stock_audit_bean ON public.bean_stock_audit_log(bean_id);
CREATE INDEX IF NOT EXISTS idx_bean_stock_audit_user ON public.bean_stock_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_bean_stock_audit_created ON public.bean_stock_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bean_stock_audit_bean_created ON public.bean_stock_audit_log(bean_id, created_at DESC);

ALTER TABLE public.bean_stock_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and admins can view bean stock audit logs" ON public.bean_stock_audit_log;
CREATE POLICY "Managers and admins can view bean stock audit logs"
  ON public.bean_stock_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and admins can insert bean stock audit logs" ON public.bean_stock_audit_log;
CREATE POLICY "Managers and admins can insert bean stock audit logs"
  ON public.bean_stock_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('manager', 'admin')
    )
  );
