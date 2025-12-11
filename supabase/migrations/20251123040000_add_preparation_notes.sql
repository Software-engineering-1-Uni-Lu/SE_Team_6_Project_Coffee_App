-- Add preparation notes and instructions to items table
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS preparation_notes TEXT,
  ADD COLUMN IF NOT EXISTS brewing_instructions JSONB,
  ADD COLUMN IF NOT EXISTS quality_standards TEXT,
  ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER DEFAULT 5;

-- Add comments
COMMENT ON COLUMN public.items.preparation_notes IS 'General preparation notes and tips for staff';
COMMENT ON COLUMN public.items.brewing_instructions IS 'Step-by-step brewing/preparation instructions as JSON array';
COMMENT ON COLUMN public.items.quality_standards IS 'Quality control standards and what to check';
COMMENT ON COLUMN public.items.preparation_time_minutes IS 'Estimated time to prepare this item';

-- Example brewing_instructions structure:
-- [
--   {"step": 1, "instruction": "Grind 18g of beans", "duration_seconds": 10},
--   {"step": 2, "instruction": "Tamp with 30lbs pressure", "duration_seconds": 5},
--   {"step": 3, "instruction": "Extract for 25-30 seconds", "duration_seconds": 30}
-- ]

-- Grant permissions (staff can view, admin can edit)
GRANT SELECT ON public.items TO authenticated;

