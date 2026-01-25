-- Enforce loyalty accrual on completed + paid orders with idempotent ledger inserts.
-- Default ratio: 10 points per €1 spent (points_per_euro in settings), rounded down to whole euros
-- to avoid fractional points and keep rewards predictable.

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_ledger_order_earned_unique
  ON public.loyalty_ledger (order_id)
  WHERE reason = 'Order completed - points earned';

CREATE OR REPLACE FUNCTION handle_orders_loyalty()
RETURNS TRIGGER AS $$
DECLARE
  pts_per_euro INTEGER;
  pts INTEGER;
  inserted_count INTEGER;
BEGIN
  -- Skip if no customer
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Load settings (configurable points ratio)
  SELECT points_per_euro INTO pts_per_euro FROM public.settings LIMIT 1;
  IF pts_per_euro IS NULL OR pts_per_euro <= 0 THEN
    pts_per_euro := 10;
  END IF;

  -- Award points only when order is completed AND paid
  IF NEW.status = 'completed' AND NEW.payment_status = 'paid'
     AND COALESCE(OLD.points_earned, 0) = 0 THEN
    pts := FLOOR(NEW.total_cents / 100) * pts_per_euro;
    IF pts > 0 THEN
      -- Keep reason text in sync with the unique index above.
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

  -- Remove earned points if order is no longer in a paid/completed state
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

  -- Cancellation: refund redeemed points if any were spent
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
