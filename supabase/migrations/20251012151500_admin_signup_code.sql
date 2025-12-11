-- Add admin signup code and update trigger to prioritize admin code, then staff code, else customer
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_signup_code TEXT NOT NULL DEFAULT 'CHANGE-ME-ADMIN-CODE';

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  s_code TEXT;
  a_code TEXT;
  provided_staff TEXT;
  provided_admin TEXT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );

  SELECT staff_signup_code, admin_signup_code INTO s_code, a_code FROM public.settings LIMIT 1;
  provided_staff := new.raw_user_meta_data->>'staff_code';
  provided_admin := new.raw_user_meta_data->>'admin_code';

  IF a_code IS NOT NULL AND provided_admin IS NOT NULL AND provided_admin = a_code THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  ELSIF s_code IS NOT NULL AND provided_staff IS NOT NULL AND provided_staff = s_code THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'staff')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'customer')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

