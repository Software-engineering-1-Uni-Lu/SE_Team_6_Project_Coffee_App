-- Run this in Supabase SQL Editor to see your guest order
-- (SQL Editor bypasses RLS)

SELECT
  id,
  guest_name,
  guest_email,
  status,
  total_cents,
  created_at
FROM orders
WHERE guest_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;
