-- Redeem loyalty points for an order
-- 10 points per €1 earned; 100 points = €5 off (i.e., 1 point = €0.05)

CREATE OR REPLACE FUNCTION public.redeem_points_for_order(p_points INTEGER, p_order UUID)
RETURNS VOID AS $$
DECLARE
  curr_points INTEGER;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN;
  END IF;
  IF p_order IS NULL THEN
    RAISE EXCEPTION 'Order id required';
  END IF;

  -- Only authenticated customers may redeem
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT loyalty_points INTO curr_points FROM public.profiles WHERE id = auth.uid();
  IF curr_points IS NULL THEN curr_points := 0; END IF;
  IF curr_points < p_points THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  UPDATE public.profiles SET loyalty_points = loyalty_points - p_points WHERE id = auth.uid();
  INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
  VALUES (auth.uid(), p_order, -p_points, 'Redeemed at checkout');

  -- Ensure the order reflects redeemed points
  UPDATE public.orders SET points_redeemed = p_points WHERE id = p_order AND customer_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

