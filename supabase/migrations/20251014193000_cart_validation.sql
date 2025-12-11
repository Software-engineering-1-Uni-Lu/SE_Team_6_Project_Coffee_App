-- Add server-side validation and constraints for carts.items JSONB

-- Helper: validate cart items JSON shape and limits
CREATE OR REPLACE FUNCTION public.validate_cart_items(p_items JSONB)
RETURNS VOID AS $$
DECLARE
  el JSONB;
  qty INTEGER;
  idx INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Cart items must be a JSON array';
  END IF;

  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Cart cannot have more than 100 items';
  END IF;

  FOR el IN SELECT jsonb_array_elements(p_items)
  LOOP
    idx := idx + 1;
    IF jsonb_typeof(el) <> 'object' THEN
      RAISE EXCEPTION 'Cart item % must be an object', idx;
    END IF;

    IF el ? 'cartItemId' IS FALSE OR jsonb_typeof(el->'cartItemId') <> 'string' THEN
      RAISE EXCEPTION 'cartItemId is required and must be a string (item %)', idx;
    END IF;
    IF el ? 'productId' IS FALSE OR jsonb_typeof(el->'productId') <> 'string' THEN
      RAISE EXCEPTION 'productId is required and must be a string (item %)', idx;
    END IF;
    IF el ? 'name' IS FALSE OR jsonb_typeof(el->'name') <> 'string' THEN
      RAISE EXCEPTION 'name is required and must be a string (item %)', idx;
    END IF;

    IF el ? 'price' IS FALSE OR (el->>'price') IS NULL THEN
      RAISE EXCEPTION 'price is required (item %)', idx;
    END IF;
    IF el ? 'basePrice' IS FALSE OR (el->>'basePrice') IS NULL THEN
      RAISE EXCEPTION 'basePrice is required (item %)', idx;
    END IF;

    -- Quantity: integer 1..50
    IF el ? 'quantity' IS FALSE THEN
      RAISE EXCEPTION 'quantity is required (item %)', idx;
    END IF;
    BEGIN
      qty := (el->>'quantity')::integer;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'quantity must be an integer (item %)', idx;
    END;
    IF qty < 1 OR qty > 50 THEN
      RAISE EXCEPTION 'quantity must be between 1 and 50 (item %)', idx;
    END IF;

    -- Optional modifiers: if present, must be an array
    IF el ? 'modifiers' THEN
      IF jsonb_typeof(el->'modifiers') <> 'array' THEN
        RAISE EXCEPTION 'modifiers must be an array (item %)', idx;
      END IF;
      IF jsonb_array_length(el->'modifiers') > 50 THEN
        RAISE EXCEPTION 'too many modifiers (item %)', idx;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger wrapper to validate NEW.items before write
CREATE OR REPLACE FUNCTION public.carts_validate_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.validate_cart_items(NEW.items);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_carts_validate_ins ON public.carts;
CREATE TRIGGER trg_carts_validate_ins
  BEFORE INSERT ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.carts_validate_trigger();

DROP TRIGGER IF EXISTS trg_carts_validate_upd ON public.carts;
CREATE TRIGGER trg_carts_validate_upd
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.carts_validate_trigger();

-- Additional safety: ensure array and cap serialized size
ALTER TABLE public.carts
  DROP CONSTRAINT IF EXISTS carts_items_array_and_limit,
  ADD CONSTRAINT carts_items_array_and_limit CHECK (
    jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 100 AND length(items::text) <= 200000
  );
