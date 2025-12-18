-- ============================================================================
-- UPDATE USER SIGNUP TO SUPPORT INVITE CODES
-- ============================================================================
--
-- PURPOSE:
-- Updates the handle_new_user() function to support invite code-based
-- registration in addition to the existing staff/admin code system.
--
-- PRIORITY ORDER:
-- 1. Invite code (if provided) - highest priority
-- 2. Admin code from settings
-- 3. Staff code from settings
-- 4. Default to customer
--
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  s_code TEXT;
  a_code TEXT;
  provided_staff TEXT;
  provided_admin TEXT;
  provided_invite TEXT;
  invite_role TEXT;
  manager_exists BOOLEAN;
BEGIN
  -- Verify that 'manager' enum value exists (should be added by migration 20251126000000)
  SELECT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'manager' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) INTO manager_exists;
  
  -- If manager role doesn't exist but we're trying to use it, log a warning
  -- This shouldn't happen if migrations ran in order
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );

  -- Get invite code from metadata if provided
  provided_invite := new.raw_user_meta_data->>'invite_code';
  
  -- If invite code is provided, it MUST be valid - no fallback to customer
  IF provided_invite IS NOT NULL THEN
    -- Validate the invite code and get the role
    SELECT validate_invite_code(provided_invite) INTO invite_role;
    
    IF invite_role IS NOT NULL THEN
      -- Validate that the role is one of the valid app_role values
      IF invite_role::text NOT IN ('admin', 'staff', 'manager', 'customer') THEN
        DELETE FROM public.profiles WHERE id = new.id;
        RAISE EXCEPTION 'Invalid role from invite code: %', invite_role;
      END IF;
      
      -- Invite code is valid, assign the role and mark as used
      -- Use explicit role assignment with error handling
      BEGIN
        -- Map text role to app_role enum explicitly
        IF invite_role::text = 'admin' THEN
          INSERT INTO public.user_roles (user_id, role) 
          VALUES (new.id, 'admin'::app_role)
          ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;
        ELSIF invite_role::text = 'staff' THEN
          INSERT INTO public.user_roles (user_id, role) 
          VALUES (new.id, 'staff'::app_role)
          ON CONFLICT (user_id) DO UPDATE SET role = 'staff'::app_role;
        ELSIF invite_role::text = 'manager' THEN
          -- Verify manager enum exists before using it
          IF NOT manager_exists THEN
            DELETE FROM public.profiles WHERE id = new.id;
            RAISE EXCEPTION 'Manager role is not available. Please ensure migration 20251126000000_add_manager_role.sql has been applied.';
          END IF;
          -- Explicitly cast to ensure manager role is assigned
          BEGIN
            INSERT INTO public.user_roles (user_id, role) 
            VALUES (new.id, 'manager'::app_role)
            ON CONFLICT (user_id) DO UPDATE SET role = 'manager'::app_role;
          EXCEPTION 
            WHEN invalid_text_representation OR invalid_parameter_value THEN
              DELETE FROM public.profiles WHERE id = new.id;
              RAISE EXCEPTION 'Cannot assign manager role: enum value may not exist. Invite code role was: %', invite_role;
            WHEN OTHERS THEN
              DELETE FROM public.profiles WHERE id = new.id;
              RAISE EXCEPTION 'Failed to assign manager role: %', SQLERRM;
          END;
        ELSIF invite_role::text = 'customer' THEN
          INSERT INTO public.user_roles (user_id, role) 
          VALUES (new.id, 'customer'::app_role)
          ON CONFLICT (user_id) DO UPDATE SET role = 'customer'::app_role;
        ELSE
          DELETE FROM public.profiles WHERE id = new.id;
          RAISE EXCEPTION 'Unexpected role value: %', invite_role;
        END IF;
      EXCEPTION 
        WHEN invalid_text_representation OR invalid_parameter_value THEN
          -- Enum value doesn't exist - this shouldn't happen if migrations ran correctly
          DELETE FROM public.profiles WHERE id = new.id;
          RAISE EXCEPTION 'Role "%" is not a valid app_role enum value. Please ensure all migrations have been applied.', invite_role;
        WHEN OTHERS THEN
          DELETE FROM public.profiles WHERE id = new.id;
          RAISE EXCEPTION 'Failed to assign role "%": %', invite_role, SQLERRM;
      END;
      
      -- Mark the invite code as used
      PERFORM mark_invite_used(provided_invite, new.id);
      
      RETURN new;
    ELSE
      -- Invite code is invalid, used, or expired - prevent account creation
      -- Delete the profile we just created
      DELETE FROM public.profiles WHERE id = new.id;
      
      -- Raise exception to prevent user creation
      RAISE EXCEPTION 'Invalid or expired invite code. Please contact an administrator for a new invite code.';
    END IF;
  END IF;

  -- Fall back to existing admin/staff code system
  SELECT staff_signup_code, admin_signup_code INTO s_code, a_code FROM public.settings LIMIT 1;
  provided_staff := new.raw_user_meta_data->>'staff_code';
  provided_admin := new.raw_user_meta_data->>'admin_code';

  -- Check admin code (higher priority than staff)
  IF a_code IS NOT NULL AND provided_admin IS NOT NULL AND provided_admin = a_code THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  -- Check staff code
  ELSIF s_code IS NOT NULL AND provided_staff IS NOT NULL AND provided_staff = s_code THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'staff')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  -- Default to customer
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'customer')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

