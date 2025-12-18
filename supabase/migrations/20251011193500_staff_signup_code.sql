-- Add a staff signup code stored in settings and use it during auth trigger
ALTER TABLE settings ADD COLUMN IF NOT EXISTS staff_signup_code TEXT NOT NULL DEFAULT 'CHANGE-ME-STAFF-CODE';

-- Replace handle_new_user to conditionally assign staff role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  provided TEXT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );

  SELECT staff_signup_code INTO code FROM public.settings LIMIT 1;
  provided := new.raw_user_meta_data->>'staff_code';

  IF code IS NOT NULL AND provided IS NOT NULL AND provided = code THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'staff');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'customer');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

