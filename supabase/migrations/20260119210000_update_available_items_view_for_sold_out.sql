-- Update available_items view to respect sold_out flag
-- Part of: Mark items sold out feature
-- 
-- Note: Items are still shown in the view, but is_available_now will be FALSE
-- if sold_out is TRUE, allowing customers to see sold out items but not add them to cart

-- Drop the existing view first to avoid column name conflicts
DROP VIEW IF EXISTS public.available_items;

-- Recreate the view with sold_out check
CREATE VIEW public.available_items AS
SELECT 
  i.*,
  CASE 
    WHEN i.sold_out = TRUE THEN FALSE
    ELSE is_item_available_now(i.availability_start, i.availability_end, i.available_days)
  END as is_available_now
FROM public.items i
WHERE i.active = TRUE;

-- Grant permissions (maintain existing)
GRANT SELECT ON public.available_items TO anon, authenticated;
