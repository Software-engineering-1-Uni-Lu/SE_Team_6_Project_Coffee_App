-- Fix guest order policy to work with Next.js client
-- Remove TO anon requirement and check auth.uid() IS NULL instead
-- This allows the policy to work regardless of how the client is created

DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;

-- New policy: Works for any client where auth.uid() IS NULL
-- This matches both anon role and any client without a session
-- Still secure because it requires auth.uid() IS NULL
CREATE POLICY "Guests can create orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    AND customer_id IS NULL
    AND guest_email IS NOT NULL
  );

