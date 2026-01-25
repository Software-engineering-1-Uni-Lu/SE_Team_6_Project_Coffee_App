-- Enable loyalty points as a payment method for authenticated customers.
-- Points required are computed per item from its price and rounded up to whole euros
-- so points are never worth more than their cash value.

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'loyalty_points';

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_ledger_order_redeem_unique
  ON public.loyalty_ledger (order_id)
  WHERE reason = 'Redeemed at checkout';

CREATE OR REPLACE FUNCTION create_loyalty_points_order(
  p_items JSONB,
  p_subtotal_cents INTEGER,
  p_tax_cents INTEGER,
  p_total_cents INTEGER,
  p_pickup_time TIMESTAMPTZ DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_order JSONB;
  pts_per_euro INTEGER;
  points_required INTEGER;
  rows_updated INTEGER;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(v_customer_id, 'customer') THEN
    RAISE EXCEPTION 'Only customers can pay with loyalty points';
  END IF;

  SELECT points_per_euro INTO pts_per_euro FROM public.settings LIMIT 1;
  IF pts_per_euro IS NULL OR pts_per_euro <= 0 THEN
    pts_per_euro := 10;
  END IF;

  -- Points cost is computed per item and rounded up to whole euros.
  SELECT COALESCE(SUM(
    CEIL(GREATEST(0, COALESCE((item->>'price')::numeric, 0)) / 100) * pts_per_euro
    * GREATEST(0, COALESCE((item->>'quantity')::int, 0))
  ), 0)
  INTO points_required
  FROM jsonb_array_elements(p_items) AS item;

  IF points_required <= 0 THEN
    RAISE EXCEPTION 'Points required could not be calculated';
  END IF;

  INSERT INTO public.orders (
    customer_id,
    status,
    items,
    subtotal_cents,
    tax_cents,
    total_cents,
    payment_method,
    payment_status,
    pickup_time,
    points_redeemed
  ) VALUES (
    v_customer_id,
    p_status::order_status,
    p_items,
    p_subtotal_cents,
    p_tax_cents,
    p_total_cents,
    'loyalty_points'::payment_method,
    'paid',
    p_pickup_time,
    points_required
  ) RETURNING id INTO v_order_id;

  UPDATE public.profiles
  SET loyalty_points = loyalty_points - points_required
  WHERE id = v_customer_id AND loyalty_points >= points_required;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
  VALUES (v_customer_id, v_order_id, -points_required, 'Redeemed at checkout')
  ON CONFLICT (order_id) WHERE reason = 'Redeemed at checkout' DO NOTHING;

  SELECT to_jsonb(o.*) INTO v_order
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION create_loyalty_points_order TO authenticated;

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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_current_uid UUID;
  v_order JSONB;
BEGIN
  v_current_uid := auth.uid();

  IF v_current_uid IS NOT NULL THEN
    RAISE EXCEPTION 'This function is for guest orders only. Authenticated users should use the regular insert.';
  END IF;

  IF p_guest_email IS NULL OR p_guest_email = '' THEN
    RAISE EXCEPTION 'Guest email is required';
  END IF;

  IF p_payment_method = 'loyalty_points' THEN
    RAISE EXCEPTION 'Loyalty points require an authenticated account';
  END IF;

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
    NULL,
    p_guest_name,
    p_guest_email,
    p_status::order_status,
    p_items,
    p_subtotal_cents,
    p_tax_cents,
    p_total_cents,
    p_payment_method::payment_method,
    p_payment_status,
    p_pickup_time
  ) RETURNING id INTO v_order_id;

  SELECT to_jsonb(o.*) INTO v_order
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION create_guest_order TO anon;

CREATE OR REPLACE FUNCTION handle_orders_loyalty()
RETURNS TRIGGER AS $$
DECLARE
  pts_per_euro INTEGER;
  pts INTEGER;
  inserted_count INTEGER;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT points_per_euro INTO pts_per_euro FROM public.settings LIMIT 1;
  IF pts_per_euro IS NULL OR pts_per_euro <= 0 THEN
    pts_per_euro := 10;
  END IF;

  -- Award points only on paid + completed cash/card orders.
  IF NEW.status = 'completed' AND NEW.payment_status = 'paid'
     AND COALESCE(OLD.points_earned, 0) = 0
     AND COALESCE(NEW.points_redeemed, 0) = 0
     AND NEW.payment_method IS DISTINCT FROM 'loyalty_points' THEN
    pts := FLOOR(NEW.total_cents / 100) * pts_per_euro;
    IF pts > 0 THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, pts, 'Order completed - points earned')
      ON CONFLICT (order_id) WHERE reason = 'Order completed - points earned' DO NOTHING;
      GET DIAGNOSTICS inserted_count = ROW_COUNT;
      IF inserted_count > 0 THEN
        UPDATE public.profiles
        SET loyalty_points = loyalty_points + pts
        WHERE id = NEW.customer_id;
      END IF;
      NEW.points_earned := pts;
    END IF;
  END IF;

  IF COALESCE(OLD.points_earned, 0) > 0
     AND NOT (NEW.status = 'completed' AND NEW.payment_status = 'paid') THEN
    IF NEW.status = 'cancelled' THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, -OLD.points_earned, 'Order cancelled');
    ELSIF NEW.payment_status IS DISTINCT FROM 'paid' THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, -OLD.points_earned, 'Payment reversed');
    ELSE
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, -OLD.points_earned, 'Order status reverted');
    END IF;

    UPDATE public.profiles
    SET loyalty_points = GREATEST(0, loyalty_points - OLD.points_earned)
    WHERE id = NEW.customer_id;
    NEW.points_earned := 0;
  END IF;

  IF (OLD.status IS DISTINCT FROM 'cancelled') AND (NEW.status = 'cancelled') THEN
    IF COALESCE(OLD.points_redeemed, 0) > 0 THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, OLD.points_redeemed, 'Order cancelled - points refunded');
      UPDATE public.profiles
      SET loyalty_points = loyalty_points + OLD.points_redeemed
      WHERE id = NEW.customer_id;
      NEW.points_redeemed := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_orders_loyalty ON public.orders;
CREATE TRIGGER trg_orders_loyalty
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION handle_orders_loyalty();
