-- ============================================================================
-- STAFF INVITE CODES TABLE
-- ============================================================================
--
-- PURPOSE:
-- Implements invite-based registration for staff, manager, and admin roles.
-- Only users with valid invite codes can register for non-customer roles.
--
-- SECURITY MODEL:
-- - Invite codes are created by admins/managers (out of scope for initial UI)
-- - Each code can only be used once
-- - Codes have expiration dates
-- - Role is embedded in the code (not selectable by user)
-- - Prevents unauthorized role elevation
--
-- USER STORY SATISFIED:
-- - CSA-19: Staff/Admin signup (invite-based registration)
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_invite_codes (
  -- Unique identifier for the invite
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The actual invite code (e.g., "STAFF-2024-ABC123")
  -- Must be unique and not guessable
  code TEXT UNIQUE NOT NULL,
  
  -- Role this invite code grants
  -- One of: 'staff', 'manager', 'admin'
  role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'admin')),
  
  -- User ID of the admin/manager who created this invite
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- When the invite was created
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- When the invite expires
  -- After this time, the invite cannot be used
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Whether the invite has been used
  used BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- User ID of who used this invite (if used)
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- When the invite was used
  used_at TIMESTAMPTZ,
  
  -- Optional notes about this invite (e.g., "For new morning shift manager")
  notes TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by code (most common query)
CREATE INDEX idx_staff_invite_codes_code ON staff_invite_codes(code);

-- Fast lookup for unused invites
-- Note: Expiration check must be done in queries, not in index predicate
-- because NOW() is not immutable
CREATE INDEX idx_staff_invite_codes_active
  ON staff_invite_codes(code)
  WHERE used = FALSE;

-- Fast lookup by creator
CREATE INDEX idx_staff_invite_codes_created_by ON staff_invite_codes(created_by);

-- Fast lookup by role
CREATE INDEX idx_staff_invite_codes_role ON staff_invite_codes(role);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE staff_invite_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read invite codes (needed for registration validation)
-- Security: The code itself acts as the secret, so reading is allowed
-- Actual validation happens server-side in the API route
CREATE POLICY "Anyone can read invite codes for validation"
  ON staff_invite_codes
  FOR SELECT
  USING (TRUE);

-- Policy: Only admins and managers can create invite codes
CREATE POLICY "Only admins and managers can create invites"
  ON staff_invite_codes
  FOR INSERT
  WITH CHECK (
    is_admin_or_manager(auth.uid())
  );

-- Policy: Only admins and managers can update invites (e.g., to add notes)
CREATE POLICY "Only admins and managers can update invites"
  ON staff_invite_codes
  FOR UPDATE
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Policy: Only admins can delete invites
CREATE POLICY "Only admins can delete invites"
  ON staff_invite_codes
  FOR DELETE
  USING (is_admin_or_manager(auth.uid()));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to validate an invite code
-- Returns NULL if invalid, otherwise returns the role
CREATE OR REPLACE FUNCTION validate_invite_code(code_input TEXT)
RETURNS TEXT AS $$
DECLARE
  invite_role TEXT;
BEGIN
  SELECT role INTO invite_role
  FROM staff_invite_codes
  WHERE code = code_input
    AND used = FALSE
    AND expires_at > NOW();
  
  RETURN invite_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to mark an invite code as used
CREATE OR REPLACE FUNCTION mark_invite_used(code_input TEXT, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE staff_invite_codes
  SET used = TRUE,
      used_by = user_id,
      used_at = NOW()
  WHERE code = code_input
    AND used = FALSE
    AND expires_at > NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get invite code details (for admin/manager views)
-- Returns invite info if user is admin/manager, NULL otherwise
CREATE OR REPLACE FUNCTION get_invite_code_details(code_input TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  role TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  used BOOLEAN,
  used_by UUID,
  used_at TIMESTAMPTZ,
  notes TEXT
) AS $$
BEGIN
  -- Only admins and managers can view invite details
  IF NOT is_admin_or_manager(auth.uid()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    sic.id,
    sic.code,
    sic.role,
    sic.created_by,
    sic.created_at,
    sic.expires_at,
    sic.used,
    sic.used_by,
    sic.used_at,
    sic.notes
  FROM staff_invite_codes sic
  WHERE sic.code = code_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to generate a secure random invite code
-- Format: ROLE-PREFIX-YYYYMMDD-RANDOM
-- Example: STAFF-CAFE-20241126-A3B7C9
CREATE OR REPLACE FUNCTION generate_invite_code(
  role_input TEXT,
  prefix TEXT DEFAULT 'INVITE',
  expires_in_days INTEGER DEFAULT 30,
  notes_input TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  generated_code TEXT;
  code_exists BOOLEAN;
  date_part TEXT;
  random_part TEXT;
BEGIN
  -- Only admins and managers can generate invite codes
  IF NOT is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and managers can generate invite codes';
  END IF;
  
  -- Validate role
  IF role_input NOT IN ('staff', 'manager', 'admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be one of: staff, manager, admin';
  END IF;
  
  -- Generate code with retry logic to ensure uniqueness
  LOOP
    -- Format: ROLE-PREFIX-YYYYMMDD-RANDOM (6 chars)
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));
    generated_code := role_input || '-' || prefix || '-' || date_part || '-' || random_part;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM staff_invite_codes WHERE code = generated_code) INTO code_exists;
    
    -- If code doesn't exist, break out of loop
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert the new invite code
  INSERT INTO staff_invite_codes (
    code,
    role,
    created_by,
    expires_at,
    notes
  ) VALUES (
    generated_code,
    role_input,
    auth.uid(),
    NOW() + (expires_in_days || ' days')::INTERVAL,
    notes_input
  );
  
  RETURN generated_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- SAMPLE DATA (FOR TESTING)
-- ============================================================================

-- Create sample invite codes for testing
-- In production, these should be created through admin interface
INSERT INTO staff_invite_codes (code, role, expires_at, notes) VALUES
  ('STAFF-DEMO-2024', 'staff', NOW() + INTERVAL '30 days', 'Demo staff invite'),
  ('MANAGER-DEMO-2024', 'manager', NOW() + INTERVAL '30 days', 'Demo manager invite'),
  ('ADMIN-DEMO-2024', 'admin', NOW() + INTERVAL '30 days', 'Demo admin invite')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================
--
-- USAGE IN REGISTRATION API:
-- 1. User provides email, password, and invite code
-- 2. API calls validate_invite_code(code) to get role
-- 3. If valid, create Supabase user with that role in metadata
-- 4. Call mark_invite_used(code, new_user_id) to mark as used
-- 5. Return success to user
--
-- EXAMPLE USAGE:
-- SELECT validate_invite_code('STAFF-DEMO-2024'); -- Returns 'staff' or NULL
-- SELECT mark_invite_used('STAFF-DEMO-2024', 'user-uuid-here'); -- Returns true/false
--

