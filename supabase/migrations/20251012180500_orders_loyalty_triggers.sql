-- Award loyalty only when payment is confirmed (paid), remove on reversal or cancellation

CREATE OR REPLACE FUNCTION handle_orders_loyalty()
RETURNS TRIGGER AS $$
DECLARE
  pts_per_euro INTEGER;
  pts INTEGER;
BEGIN
  -- Skip if no customer
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Load settings
  SELECT points_per_euro INTO pts_per_euro FROM public.settings LIMIT 1;
  IF pts_per_euro IS NULL THEN pts_per_euro := 10; END IF;

  -- Payment confirmed: award points if not already awarded
  IF (OLD.payment_status IS DISTINCT FROM 'paid') AND (NEW.payment_status = 'paid') THEN
    pts := FLOOR(NEW.total_cents / 100) * pts_per_euro;
    IF pts > 0 AND COALESCE(OLD.points_earned, 0) = 0 THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, pts, 'Payment confirmed');
      UPDATE public.profiles SET loyalty_points = loyalty_points + pts WHERE id = NEW.customer_id;
      NEW.points_earned := pts;
    END IF;
  END IF;

  -- Payment reversed: remove points if previously awarded
  IF (OLD.payment_status = 'paid') AND (NEW.payment_status IS DISTINCT FROM 'paid') THEN
    IF COALESCE(OLD.points_earned, 0) > 0 THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, -OLD.points_earned, 'Payment reversed');
      UPDATE public.profiles SET loyalty_points = GREATEST(0, loyalty_points - OLD.points_earned) WHERE id = NEW.customer_id;
      NEW.points_earned := 0;
    END IF;
  END IF;

  -- Cancellation: remove points if any had been awarded
  IF (OLD.status IS DISTINCT FROM 'cancelled') AND (NEW.status = 'cancelled') THEN
    IF COALESCE(OLD.points_earned, 0) > 0 THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, -OLD.points_earned, 'Order cancelled');
      UPDATE public.profiles SET loyalty_points = GREATEST(0, loyalty_points - OLD.points_earned) WHERE id = NEW.customer_id;
      NEW.points_earned := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_orders_loyalty ON public.orders;
CREATE TRIGGER trg_orders_loyalty
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION handle_orders_loyalty();

