-- Award loyalty points immediately for paid card orders.
-- Cash orders still earn points only once completed + paid.

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_ledger_order_earned_unique
  ON public.loyalty_ledger (order_id)
  WHERE reason = 'Order completed - points earned';

CREATE OR REPLACE FUNCTION handle_orders_loyalty()
RETURNS TRIGGER AS $$
DECLARE
  pts_per_euro INTEGER;
  pts INTEGER;
  inserted_count INTEGER;
  should_award BOOLEAN;
  valid_earned_state BOOLEAN;
  old_points_earned INTEGER;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT points_per_euro INTO pts_per_euro FROM public.settings LIMIT 1;
  IF pts_per_euro IS NULL OR pts_per_euro <= 0 THEN
    pts_per_euro := 10;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    old_points_earned := COALESCE(OLD.points_earned, 0);
  ELSE
    old_points_earned := 0;
  END IF;

  should_award :=
    old_points_earned = 0
    AND COALESCE(NEW.points_earned, 0) = 0
    AND COALESCE(NEW.points_redeemed, 0) = 0
    AND NEW.payment_method IS DISTINCT FROM 'loyalty_points'
    AND NEW.payment_status = 'paid'
    AND NEW.status <> 'cancelled'
    AND (NEW.status = 'completed' OR NEW.payment_method = 'card');

  IF should_award THEN
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
        UPDATE public.orders
        SET points_earned = pts
        WHERE id = NEW.id AND points_earned = 0;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    valid_earned_state :=
      NEW.payment_status = 'paid'
      AND NEW.payment_method IS DISTINCT FROM 'loyalty_points'
      AND COALESCE(NEW.points_redeemed, 0) = 0
      AND NEW.status <> 'cancelled'
      AND (NEW.status = 'completed' OR NEW.payment_method = 'card');

    IF old_points_earned > 0
       AND COALESCE(NEW.points_earned, 0) > 0
       AND NOT valid_earned_state THEN
      IF NEW.status = 'cancelled' THEN
        INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
        VALUES (NEW.customer_id, NEW.id, -old_points_earned, 'Order cancelled');
      ELSIF NEW.payment_status IS DISTINCT FROM 'paid' THEN
        INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
        VALUES (NEW.customer_id, NEW.id, -old_points_earned, 'Payment reversed');
      ELSE
        INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
        VALUES (NEW.customer_id, NEW.id, -old_points_earned, 'Order status reverted');
      END IF;

      UPDATE public.profiles
      SET loyalty_points = GREATEST(0, loyalty_points - old_points_earned)
      WHERE id = NEW.customer_id;
      UPDATE public.orders
      SET points_earned = 0
      WHERE id = NEW.id AND points_earned = old_points_earned;
    END IF;

    IF (OLD.status IS DISTINCT FROM 'cancelled') AND (NEW.status = 'cancelled') THEN
      IF COALESCE(OLD.points_redeemed, 0) > 0 THEN
        INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
        VALUES (NEW.customer_id, NEW.id, OLD.points_redeemed, 'Order cancelled - points refunded');
        UPDATE public.profiles
        SET loyalty_points = loyalty_points + OLD.points_redeemed
        WHERE id = NEW.customer_id;
        UPDATE public.orders
        SET points_redeemed = 0
        WHERE id = NEW.id AND points_redeemed = OLD.points_redeemed;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_orders_loyalty ON public.orders;
CREATE TRIGGER trg_orders_loyalty
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION handle_orders_loyalty();
