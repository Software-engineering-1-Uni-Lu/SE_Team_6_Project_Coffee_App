-- Add pickup_time parameter to create_guest_order function
-- This allows guest orders to specify a pickup time
-- CSA-104, CSA-105, CSA-106: Pickup time implementation

-- Drop existing function (need to update signature)
DROP FUNCTION IF EXISTS create_guest_order(text, text, jsonb, integer, integer, integer, text, text, text);

-- Recreate function with pickup_time parameter
CREATE OR REPLACE FUNCTION create_guest_order(
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_items JSONB,
  p_subtotal_cents INTEGER,
  p_tax_cents INTEGER,
  p_total_cents INTEGER,
  p_payment_method TEXT,
  p_payment_status TEXT DEFAULT 'unpaid',
  p_status TEXT DEFAULT 'pending',
  p_pickup_time TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS, but we validate manually
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_current_uid UUID;
  v_order JSONB;
BEGIN
  -- Get current auth.uid() (should be NULL for guests)
  v_current_uid := auth.uid();

  -- Manual validation (same as RLS policy)
  -- Only allow if auth.uid() IS NULL (guest request)
  IF v_current_uid IS NOT NULL THEN
    RAISE EXCEPTION 'This function is for guest orders only. Authenticated users should use the regular insert.';
  END IF;

  -- Validate required fields (same as RLS policy)
  IF p_guest_email IS NULL OR p_guest_email = '' THEN
    RAISE EXCEPTION 'Guest email is required';
  END IF;

  -- Insert order
  -- Cast text parameters to enum types where needed
  INSERT INTO public.orders (
    customer_id,
    guest_name,
    guest_email,
    status,
    items,
    subtotal_cents,
    tax_cents,
    total_cents,
    payment_method,
    payment_status,
    pickup_time
  ) VALUES (
    NULL, -- customer_id must be NULL for guests
    p_guest_name,
    p_guest_email,
    p_status::order_status, -- Cast text to order_status enum
    p_items,
    p_subtotal_cents,
    p_tax_cents,
    p_total_cents,
    p_payment_method::payment_method, -- Cast text to payment_method enum
    p_payment_status,
    p_pickup_time
  ) RETURNING id INTO v_order_id;

  -- Fetch the full order and return as JSONB
  -- This bypasses RLS since we're in SECURITY DEFINER context
  SELECT to_jsonb(o.*) INTO v_order
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN v_order;
END;
$$;

-- Grant execute permission to anon role (for guest requests)
GRANT EXECUTE ON FUNCTION create_guest_order TO anon;

-- Add comment
COMMENT ON FUNCTION create_guest_order IS
  'Creates a guest order with optional pickup time. Only works when auth.uid() IS NULL. Validates all requirements manually (same as RLS policy).';
