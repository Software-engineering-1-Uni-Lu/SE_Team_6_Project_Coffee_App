-- Prevent staff/admin from placing "customer" orders by tightening the insert policy
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

CREATE POLICY "Users can create own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id AND has_role(auth.uid(), 'customer')
  );

