-- Allow anonymous guests to create orders with guest info
-- Keeps existing customer insert policy intact

-- Create a policy permitting inserts when called by anon (no auth.uid())
DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;
CREATE POLICY "Guests can create orders"
  ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (
    auth.uid() IS NULL
    AND customer_id IS NULL
    AND guest_email IS NOT NULL
  );

