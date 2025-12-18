-- Ensure one role per user, with priority admin > staff > customer
WITH ranked AS (
  SELECT user_id, role,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY CASE role WHEN 'admin' THEN 3 WHEN 'staff' THEN 2 ELSE 1 END DESC
         ) AS rn
  FROM user_roles
)
DELETE FROM user_roles ur
USING ranked r
WHERE ur.user_id = r.user_id AND ur.role = r.role AND r.rn > 1;

-- Replace composite unique with single-column unique
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- Allow admins to update any profile (e.g., loyalty points)
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
