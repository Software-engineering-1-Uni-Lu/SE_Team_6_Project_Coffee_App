-- Prevent an admin from changing their own role to staff/customer
CREATE OR REPLACE FUNCTION prevent_admin_self_demotion()
RETURNS TRIGGER AS $$
BEGIN
  -- If the logged-in user is modifying their own user_roles row, enforce 'admin'
  IF auth.uid() = NEW.user_id AND NEW.role <> 'admin' THEN
    RAISE EXCEPTION 'Admins cannot change their own role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_admin_self_demotion_ins ON public.user_roles;
CREATE TRIGGER trg_prevent_admin_self_demotion_ins
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION prevent_admin_self_demotion();

DROP TRIGGER IF EXISTS trg_prevent_admin_self_demotion_upd ON public.user_roles;
CREATE TRIGGER trg_prevent_admin_self_demotion_upd
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION prevent_admin_self_demotion();

