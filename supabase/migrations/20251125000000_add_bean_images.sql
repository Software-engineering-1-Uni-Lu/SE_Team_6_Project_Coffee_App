-- Add image_url column to beans table
ALTER TABLE public.beans 
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.beans.image_url IS 'URL to bean image. Can be from Supabase Storage (uploaded via admin UI) or external source (e.g., Unsplash). Images should be at least 800x600px for best quality.';

