-- Update image URLs for specific menu items
-- Uses Unsplash as an external image source (consistent 4:3 crop params)

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1541329351076-600b0f9fdf28?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'english-breakfast';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'americano';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1754325287655-3f687f6e14d7?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'caprese';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1602603412313-ab713536e288?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'chamomile';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1631129023315-7ef0e76faaed?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'chocolate-croissant';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1630182266697-92508c01e2d1?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'cinnamon-roll';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1498604636225-6b87a314baa0?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'earl-grey';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1655279562015-047c3da9a271?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'grilled-veggie';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1609016617751-e80552ae6ec2?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'jasmine-green';

UPDATE items
SET image_url = 'https://images.unsplash.com/photo-1608330557791-8dff6a434bbf?w=800&h=600&fit=crop&auto=format&q=80'
WHERE slug = 'turkey-avocado';
