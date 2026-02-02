-- Create table for tracking missing ingredient notifications
CREATE TABLE IF NOT EXISTS public.missing_ingredient_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bean_id UUID NOT NULL REFERENCES public.beans(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX idx_missing_ingredients_status ON public.missing_ingredient_notifications(status);
CREATE INDEX idx_missing_ingredients_bean_id ON public.missing_ingredient_notifications(bean_id);
CREATE INDEX idx_missing_ingredients_created_at ON public.missing_ingredient_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.missing_ingredient_notifications ENABLE ROW LEVEL SECURITY;

-- Policies: Staff can view and report, managers can manage
CREATE POLICY "Staff can view missing ingredient notifications"
  ON public.missing_ingredient_notifications FOR SELECT
  USING (is_staff_or_above(auth.uid()));

CREATE POLICY "Staff can report missing ingredients"
  ON public.missing_ingredient_notifications FOR INSERT
  WITH CHECK (is_staff_or_above(auth.uid()));

CREATE POLICY "Managers can update missing ingredient notifications"
  ON public.missing_ingredient_notifications FOR UPDATE
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can delete missing ingredient notifications"
  ON public.missing_ingredient_notifications FOR DELETE
  USING (is_admin_or_manager(auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_missing_ingredient_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status != OLD.status AND NEW.status IN ('resolved', 'ignored') THEN
    NEW.resolved_at = NOW();
    NEW.resolved_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update timestamp
CREATE TRIGGER trg_update_missing_ingredient_notification_timestamp
  BEFORE UPDATE ON public.missing_ingredient_notifications
  FOR EACH ROW EXECUTE FUNCTION update_missing_ingredient_notification_timestamp();
