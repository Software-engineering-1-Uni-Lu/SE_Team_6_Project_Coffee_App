-- Fix 1: Ensure users can read their own role (Critical for auth checks)
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Fix 2: Update shift_notes policies to include 'manager' and fix permissions
DROP POLICY IF EXISTS "Staff can view shift notes" ON public.shift_notes;
DROP POLICY IF EXISTS "Staff can create shift notes" ON public.shift_notes;
DROP POLICY IF EXISTS "Staff can update own notes" ON public.shift_notes;

-- View Policy: Staff, Managers, Admins
CREATE POLICY "Staff view shift notes"
  ON public.shift_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('staff', 'manager', 'admin')
    )
  );

-- Create Policy: Staff, Managers, Admins
CREATE POLICY "Staff create shift notes"
  ON public.shift_notes
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('staff', 'manager', 'admin')
    )
  );

-- Update Policy: Staff (own), Managers (all), Admins (all)
CREATE POLICY "Staff update shift notes"
  ON public.shift_notes
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('manager', 'admin')
    )
  );
