-- Allow customers to mark their own card orders as paid (client-side flow)
DROP POLICY IF EXISTS "Customer can confirm own card payment" ON public.orders;

CREATE POLICY "Customer can confirm own card payment"
  ON public.orders
  FOR UPDATE
  USING (
    auth.uid() = customer_id AND payment_method = 'card' AND payment_status = 'unpaid'
  )
  WITH CHECK (
    auth.uid() = customer_id AND payment_method = 'card' AND payment_status = 'paid'
  );

