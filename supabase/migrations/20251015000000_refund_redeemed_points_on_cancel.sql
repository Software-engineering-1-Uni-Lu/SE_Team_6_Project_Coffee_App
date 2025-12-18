-- Refund redeemed points when an order is cancelled
CREATE OR REPLACE FUNCTION public.refund_redeemed_points_on_cancel(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  order_record RECORD;
  refund_points INTEGER;
BEGIN
  -- Get the order details
  SELECT customer_id, points_redeemed, status 
  INTO order_record 
  FROM public.orders 
  WHERE id = p_order_id;
  
  -- Only proceed if order exists and has a customer
  IF order_record.customer_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Only refund if order was cancelled and had redeemed points
  IF order_record.status = 'cancelled' AND COALESCE(order_record.points_redeemed, 0) > 0 THEN
    refund_points := order_record.points_redeemed;
    
    -- Add points back to customer's account
    UPDATE public.profiles 
    SET loyalty_points = loyalty_points + refund_points 
    WHERE id = order_record.customer_id;
    
    -- Log the refund in loyalty ledger
    INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
    VALUES (order_record.customer_id, p_order_id, refund_points, 'Order cancelled - points refunded');
    
    -- Clear the redeemed points from the order to prevent double refunding
    UPDATE public.orders 
    SET points_redeemed = 0 
    WHERE id = p_order_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the existing loyalty trigger to also handle redeemed points refund
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

  -- Cancellation: remove earned points AND refund redeemed points
  IF (OLD.status IS DISTINCT FROM 'cancelled') AND (NEW.status = 'cancelled') THEN
    -- Remove earned points if any had been awarded
    IF COALESCE(OLD.points_earned, 0) > 0 THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, -OLD.points_earned, 'Order cancelled');
      UPDATE public.profiles SET loyalty_points = GREATEST(0, loyalty_points - OLD.points_earned) WHERE id = NEW.customer_id;
      NEW.points_earned := 0;
    END IF;
    
    -- Refund redeemed points if any were spent
    IF COALESCE(OLD.points_redeemed, 0) > 0 THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (NEW.customer_id, NEW.id, OLD.points_redeemed, 'Order cancelled - points refunded');
      UPDATE public.profiles SET loyalty_points = loyalty_points + OLD.points_redeemed WHERE id = NEW.customer_id;
      NEW.points_redeemed := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
