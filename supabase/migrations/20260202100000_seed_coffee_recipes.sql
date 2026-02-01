-- Seed Milk ingredient (unit ml) and default coffee drink recipes.
-- Recipe amounts based on industry standards:
--   Espresso: 18g coffee (double shot)
--   Americano: 18g coffee, no milk
--   Cappuccino: 18g coffee, 120 ml milk (1/3 milk, 1/3 foam)
--   Latte: 18g coffee, 250 ml milk
--   Flat White: 18g coffee, 150 ml milk (microfoam, smaller than latte)

-- Ensure Milk exists as an ingredient (unit ml)
INSERT INTO public.beans (name, price_delta_cents, active, unit)
VALUES ('Milk', 0, true, 'ml')
ON CONFLICT (name) DO UPDATE SET unit = 'ml';

-- Seed item_ingredients for coffee drinks (by item slug, using House Blend and Milk)
INSERT INTO public.item_ingredients (item_id, bean_id, quantity_needed)
SELECT i.id, b.id, 18
FROM public.items i
CROSS JOIN public.beans b
WHERE i.slug = 'espresso' AND b.name = 'House Blend'
ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;

INSERT INTO public.item_ingredients (item_id, bean_id, quantity_needed)
SELECT i.id, b.id, 18
FROM public.items i
CROSS JOIN public.beans b
WHERE i.slug = 'americano' AND b.name = 'House Blend'
ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;

INSERT INTO public.item_ingredients (item_id, bean_id, quantity_needed)
SELECT i.id, b.id, 18
FROM public.items i
CROSS JOIN public.beans b
WHERE i.slug = 'cappuccino' AND b.name = 'House Blend'
ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;

INSERT INTO public.item_ingredients (item_id, bean_id, quantity_needed)
SELECT i.id, b.id, 120
FROM public.items i
CROSS JOIN public.beans b
WHERE i.slug = 'cappuccino' AND b.name = 'Milk'
ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;

INSERT INTO public.item_ingredients (item_id, bean_id, quantity_needed)
SELECT i.id, b.id, 18
FROM public.items i
CROSS JOIN public.beans b
WHERE i.slug = 'latte' AND b.name = 'House Blend'
ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;

INSERT INTO public.item_ingredients (item_id, bean_id, quantity_needed)
SELECT i.id, b.id, 250
FROM public.items i
CROSS JOIN public.beans b
WHERE i.slug = 'latte' AND b.name = 'Milk'
ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;

INSERT INTO public.item_ingredients (item_id, bean_id, quantity_needed)
SELECT i.id, b.id, 18
FROM public.items i
CROSS JOIN public.beans b
WHERE i.slug = 'flat-white' AND b.name = 'House Blend'
ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;

INSERT INTO public.item_ingredients (item_id, bean_id, quantity_needed)
SELECT i.id, b.id, 150
FROM public.items i
CROSS JOIN public.beans b
WHERE i.slug = 'flat-white' AND b.name = 'Milk'
ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;
