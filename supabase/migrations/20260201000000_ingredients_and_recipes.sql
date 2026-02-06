-- Extend beans table with ingredient management fields
ALTER TABLE public.beans
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold NUMERIC NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'g' CHECK (unit IN ('g', 'ml', 'pcs'));

-- Recipe table: how much of each ingredient a menu item uses
CREATE TABLE IF NOT EXISTS public.item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  bean_id UUID NOT NULL REFERENCES public.beans(id) ON DELETE CASCADE,
  quantity_needed NUMERIC NOT NULL CHECK (quantity_needed > 0),
  UNIQUE (item_id, bean_id)
);

ALTER TABLE public.item_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Item ingredients viewable by everyone"
  ON public.item_ingredients FOR SELECT USING (true);

CREATE POLICY "Managers can manage item ingredients"
  ON public.item_ingredients FOR ALL
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Function: deduct ingredients when order is confirmed
CREATE OR REPLACE FUNCTION deduct_ingredients_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  order_item JSONB;
  item_qty INTEGER;
  product_id UUID;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
    FOR order_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      product_id := (order_item->>'productId')::UUID;
      item_qty := (order_item->>'quantity')::INTEGER;

      UPDATE public.beans b
      SET stock_quantity = b.stock_quantity - (ii.quantity_needed * item_qty)
      FROM public.item_ingredients ii
      WHERE ii.item_id = product_id AND ii.bean_id = b.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_deduct_ingredients
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION deduct_ingredients_on_confirm();
