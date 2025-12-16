-- Migration: Staff Management Helper Functions
-- Purpose: Add database functions for staff management permission checking and data retrieval
-- User Stories: CSA-132, CSA-133, CSA-134

-- ============================================================================
-- PERMISSION CHECKING FUNCTION
-- ============================================================================

/**
 * Function: can_manage_user
 * Purpose: Check if a manager/admin can manage another user
 *
 * Permission Rules:
 * - Admin can manage anyone (staff, manager, admin)
 * - Manager can only manage staff (not other managers or admins)
 * - Staff and customers cannot manage anyone
 *
 * @param manager_id - UUID of the user performing the action
 * @param target_user_id - UUID of the user being managed
 * @returns BOOLEAN - true if manager_id can manage target_user_id
 */
CREATE OR REPLACE FUNCTION can_manage_user(
  manager_id UUID,
  target_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  manager_role TEXT;
  target_role TEXT;
BEGIN
  -- Get the manager's role
  SELECT role::text INTO manager_role
  FROM user_roles
  WHERE user_id = manager_id;

  -- Get the target user's role
  SELECT role::text INTO target_role
  FROM user_roles
  WHERE user_id = target_user_id;

  -- If either role not found, deny access
  IF manager_role IS NULL OR target_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin can manage anyone
  IF manager_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Manager can only manage staff (not other managers or admins)
  IF manager_role = 'manager' AND target_role = 'staff' THEN
    RETURN TRUE;
  END IF;

  -- All other cases: deny access
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add comment for documentation
COMMENT ON FUNCTION can_manage_user(UUID, UUID) IS
'Checks if a manager/admin can manage another user. Admins can manage anyone, managers can only manage staff.';

-- ============================================================================
-- STAFF LIST RETRIEVAL FUNCTION
-- ============================================================================

/**
 * Function: get_manageable_staff
 * Purpose: Get list of staff members that the current user can manage
 *
 * Filtering Rules:
 * - Admin sees: staff, manager, admin (all non-customer roles)
 * - Manager sees: staff only
 * - Others see: nothing (empty result)
 *
 * @returns TABLE with user profile and role information
 */
CREATE OR REPLACE FUNCTION get_manageable_staff()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT,
  blocked BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  current_role TEXT;
BEGIN
  -- Get the current user's role
  SELECT user_roles.role::text INTO current_role
  FROM user_roles
  WHERE user_id = auth.uid();

  -- If no role found or not authenticated, return empty
  IF current_role IS NULL THEN
    RETURN;
  END IF;

  -- Admin sees everyone (staff, manager, admin)
  IF current_role = 'admin' THEN
    RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.phone,
      ur.role::text,
      p.blocked,
      p.created_at
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role::text IN ('staff', 'manager', 'admin')
    ORDER BY
      CASE ur.role::text
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'staff' THEN 3
      END,
      p.full_name NULLS LAST,
      p.email;

  -- Manager only sees staff
  ELSIF current_role = 'manager' THEN
    RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.phone,
      ur.role::text,
      p.blocked,
      p.created_at
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'staff'
    ORDER BY p.full_name NULLS LAST, p.email;

  -- Staff and customers see nothing
  ELSE
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add comment for documentation
COMMENT ON FUNCTION get_manageable_staff() IS
'Returns list of staff members that the current user can manage. Filters by role: admins see all, managers see only staff.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- These functions use SECURITY DEFINER, so they run with the privileges of the function owner
-- This allows RLS-protected queries to work correctly
-- The functions themselves enforce permission logic

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION can_manage_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_manageable_staff() TO authenticated;
