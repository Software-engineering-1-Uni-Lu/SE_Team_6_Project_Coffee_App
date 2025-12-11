-- Add scheduling fields to items table for time-bound menus
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS availability_start TIME,
  ADD COLUMN IF NOT EXISTS availability_end TIME,
  ADD COLUMN IF NOT EXISTS available_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

-- Add comments
COMMENT ON COLUMN public.items.availability_start IS 'Start time for item availability (e.g., breakfast items available from 07:00)';
COMMENT ON COLUMN public.items.availability_end IS 'End time for item availability (e.g., breakfast items available until 11:00)';
COMMENT ON COLUMN public.items.available_days IS 'Days of the week when item is available';

-- Create helper function to check if item is currently available
CREATE OR REPLACE FUNCTION is_item_available_now(
  p_availability_start TIME,
  p_availability_end TIME,
  p_available_days TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  current_time_of_day TIME;
  current_day_of_week TEXT;
BEGIN
  -- Get current time and day
  current_time_of_day := LOCALTIME;
  current_day_of_week := LOWER(TO_CHAR(CURRENT_DATE, 'Day'));
  current_day_of_week := TRIM(current_day_of_week);
  
  -- If no scheduling constraints, item is available
  IF p_availability_start IS NULL AND p_availability_end IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check day of week
  IF p_available_days IS NOT NULL AND NOT (current_day_of_week = ANY(p_available_days)) THEN
    RETURN FALSE;
  END IF;
  
  -- Check time constraints
  IF p_availability_start IS NOT NULL AND p_availability_end IS NOT NULL THEN
    -- Handle cases where end time is before start time (crosses midnight)
    IF p_availability_end < p_availability_start THEN
      RETURN current_time_of_day >= p_availability_start OR current_time_of_day <= p_availability_end;
    ELSE
      RETURN current_time_of_day >= p_availability_start AND current_time_of_day <= p_availability_end;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a view for currently available items (respects time constraints)
CREATE OR REPLACE VIEW public.available_items AS
SELECT 
  i.*,
  is_item_available_now(i.availability_start, i.availability_end, i.available_days) as is_available_now
FROM public.items i
WHERE i.active = TRUE;

-- Grant permissions
GRANT SELECT ON public.available_items TO anon, authenticated;

