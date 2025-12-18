-- Replace broad staff/admin update policy with split policies to restrict staff updates on archived orders
DROP POLICY IF EXISTS "Admins and staff can update orders" ON public.orders;

-- Admins can update any order
CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Staff can update only active orders (not completed/cancelled)
CREATE POLICY "Staff can update active orders"
  ON public.orders
  FOR UPDATE
  USING (has_role(auth.uid(), 'staff') AND status NOT IN ('completed','cancelled'))
  WITH CHECK (has_role(auth.uid(), 'staff') AND status NOT IN ('completed','cancelled'));

