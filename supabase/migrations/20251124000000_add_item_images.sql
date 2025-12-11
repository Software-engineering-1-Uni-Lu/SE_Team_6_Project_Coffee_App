-- Add image URLs to menu items using high-quality stock photos
-- Using Unsplash as a free image source (can be replaced with uploaded images later via admin UI)

-- Coffee images (high-quality coffee photography)
UPDATE items SET image_url = 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'espresso';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'cappuccino';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'latte';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'flat-white';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'americano';

-- Tea images (elegant tea photography)
UPDATE items SET image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'english-breakfast';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'earl-grey';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'jasmine-green';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'chamomile';

-- Pastry images (appetizing baked goods)
UPDATE items SET image_url = 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'croissant';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'chocolate-croissant';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'blueberry-muffin';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'cinnamon-roll';

-- Sandwich images (fresh, appetizing sandwiches)
UPDATE items SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'turkey-avocado';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'caprese';

UPDATE items SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&h=600&fit=crop&auto=format&q=80' 
WHERE slug = 'grilled-veggie';

-- Add comment for documentation
COMMENT ON COLUMN items.image_url IS 'URL to item image. Can be from Supabase Storage (uploaded via admin UI) or external source (e.g., Unsplash). Images should be at least 800x600px for best quality.';

