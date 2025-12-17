-- Fix manager access to user_roles table for SELECT operations
-- Managers need to be able to view all user_roles for dashboard statistics

-- The is_admin_or_manager() function uses SECURITY DEFINER, so it bypasses RLS
-- This means it can read from user_roles even when the calling user can't
-- So we can safely use it in the policy

-- Add a specific SELECT policy for managers/admins to view all user_roles
DROP POLICY IF EXISTS "Admins and managers can view all roles" ON user_roles;
CREATE POLICY "Admins and managers can view all roles"
  ON user_roles FOR SELECT
  USING (is_admin_or_manager(auth.uid()));

-- Note: The "Users can view own roles" policy allows users to see their own role
-- The "Admins can manage all roles" policy (FOR ALL) should also work, but
-- having an explicit SELECT policy ensures it works correctly for queries

