-- Allow staff to transition active orders to completed/cancelled, but block edits after archive
-- Previous policy required NEW.status NOT IN ('completed','cancelled'), which blocked transitions.

DROP POLICY IF EXISTS "Staff can update active orders" ON public.orders;

CREATE POLICY "Staff can update active orders"
  ON public.orders
  FOR UPDATE
  USING (
    -- Staff may update only while the current row is active
    has_role(auth.uid(),'staff') AND status NOT IN ('completed','cancelled')
  )
  WITH CHECK (
    -- New row can have any status/payment as long as updater is staff
    has_role(auth.uid(),'staff')
  );

