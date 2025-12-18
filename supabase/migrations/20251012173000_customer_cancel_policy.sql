-- Allow customers to cancel their own pending orders only
DROP POLICY IF EXISTS "Customers can cancel own pending" ON public.orders;

CREATE POLICY "Customers can cancel own pending"
  ON public.orders
  FOR UPDATE
  USING (
    auth.uid() = customer_id AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = customer_id AND status = 'cancelled'
  );

