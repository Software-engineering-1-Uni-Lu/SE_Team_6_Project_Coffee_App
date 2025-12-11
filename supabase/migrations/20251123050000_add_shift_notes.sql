-- Create shift notes table for handover information
CREATE TABLE IF NOT EXISTS public.shift_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'night')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('prep_status', 'inventory', 'equipment', 'customers', 'general', 'urgent')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  title TEXT NOT NULL,
  note TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shift_notes_date ON public.shift_notes(shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_shift_notes_shift_type ON public.shift_notes(shift_type);
CREATE INDEX IF NOT EXISTS idx_shift_notes_resolved ON public.shift_notes(resolved);
CREATE INDEX IF NOT EXISTS idx_shift_notes_priority ON public.shift_notes(priority);
CREATE INDEX IF NOT EXISTS idx_shift_notes_created_at ON public.shift_notes(created_at DESC);

-- Add comments
COMMENT ON TABLE public.shift_notes IS 'Notes left by staff for shift handovers';
COMMENT ON COLUMN public.shift_notes.shift_type IS 'Type of shift: morning (6am-12pm), afternoon (12pm-6pm), evening (6pm-12am), night (12am-6am)';
COMMENT ON COLUMN public.shift_notes.category IS 'Category: prep_status, inventory, equipment, customers, general, urgent';
COMMENT ON COLUMN public.shift_notes.priority IS 'Priority level: low, normal, high, urgent';

-- RLS Policies
ALTER TABLE public.shift_notes ENABLE ROW LEVEL SECURITY;

-- Staff and admins can view all shift notes
CREATE POLICY "Staff can view shift notes"
  ON public.shift_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Staff and admins can create shift notes
CREATE POLICY "Staff can create shift notes"
  ON public.shift_notes
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Staff can update their own notes, admins can update any
CREATE POLICY "Staff can update own notes"
  ON public.shift_notes
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shift_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shift_notes_updated_at
  BEFORE UPDATE ON public.shift_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_notes_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.shift_notes TO authenticated;

