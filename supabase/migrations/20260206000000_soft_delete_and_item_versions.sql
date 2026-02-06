-- Add soft delete column to items table
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for filtering non-deleted items
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON public.items(deleted_at) WHERE deleted_at IS NULL;

-- Create item_versions table for version history
CREATE TABLE IF NOT EXISTS public.item_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  image_url TEXT,
  allergens TEXT[] DEFAULT '{}',
  vegetarian BOOLEAN DEFAULT FALSE,
  vegan BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  modifiers JSONB DEFAULT '[]',
  stock_quantity INTEGER,
  track_inventory BOOLEAN DEFAULT FALSE,
  low_stock_threshold INTEGER,
  reorder_quantity INTEGER,
  sold_out BOOLEAN DEFAULT FALSE,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, version_number)
);

-- Create index for querying versions by item
CREATE INDEX IF NOT EXISTS idx_item_versions_item_id ON public.item_versions(item_id, version_number DESC);

-- Trigger function to snapshot item on UPDATE
CREATE OR REPLACE FUNCTION snapshot_item_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.item_versions
  WHERE item_id = OLD.id;

  INSERT INTO public.item_versions (
    item_id, version_number, name, slug, description, price_cents,
    category_id, image_url, allergens, vegetarian, vegan, active,
    modifiers, stock_quantity, track_inventory, low_stock_threshold,
    reorder_quantity, sold_out, changed_at
  ) VALUES (
    OLD.id, next_version, OLD.name, OLD.slug, OLD.description, OLD.price_cents,
    OLD.category_id, OLD.image_url, OLD.allergens, OLD.vegetarian, OLD.vegan, OLD.active,
    OLD.modifiers, OLD.stock_quantity, OLD.track_inventory, OLD.low_stock_threshold,
    OLD.reorder_quantity, OLD.sold_out, NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_snapshot_item_version'
  ) THEN
    CREATE TRIGGER trigger_snapshot_item_version
      BEFORE UPDATE ON public.items
      FOR EACH ROW
      EXECUTE FUNCTION snapshot_item_version();
  END IF;
END;
$$;

-- RLS for item_versions
ALTER TABLE public.item_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can view item versions (same as items)
CREATE POLICY "Anyone can view item versions"
  ON public.item_versions FOR SELECT
  USING (true);

-- Only managers/admins can insert (via trigger, but policy needed)
CREATE POLICY "System can insert item versions"
  ON public.item_versions FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.item_versions TO anon, authenticated;
GRANT INSERT ON public.item_versions TO authenticated;

COMMENT ON TABLE public.item_versions IS 'Version history for menu items, automatically populated on UPDATE via trigger';
COMMENT ON COLUMN public.items.deleted_at IS 'Soft delete timestamp; NULL means active, non-NULL means deleted';
