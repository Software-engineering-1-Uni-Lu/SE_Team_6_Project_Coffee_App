-- Allow customers to modify their own pending orders (items, totals)
-- The existing "Customers can cancel own pending" policy only allows
-- updates where status becomes 'cancelled'. This policy allows updates
-- where status remains 'pending' (for order modification within grace period).

CREATE POLICY "Customers can modify own pending"
  ON public.orders
  FOR UPDATE
  USING (
    auth.uid() = customer_id AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = customer_id AND status = 'pending'
  );
