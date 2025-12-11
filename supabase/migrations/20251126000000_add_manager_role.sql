-- Add 'manager' role to app_role enum
-- Note: Enum additions must be committed before the value can be used
-- We check first to avoid errors on re-runs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'manager' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE app_role ADD VALUE 'manager';
  END IF;
END $$;

-- Create helper function to check if user is admin or manager
-- Using text comparison to work around enum commit requirement
CREATE OR REPLACE FUNCTION is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role::text IN ('admin', 'manager')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- Update prevent_admin_self_demotion to also prevent manager self-demotion
CREATE OR REPLACE FUNCTION prevent_admin_self_demotion()
RETURNS TRIGGER AS $$
BEGIN
  -- If the logged-in user is modifying their own user_roles row, enforce 'admin' or 'manager'
  IF auth.uid() = NEW.user_id AND NEW.role::text NOT IN ('admin', 'manager') THEN
    -- Check if they currently have admin or manager role
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager')
    ) THEN
      RAISE EXCEPTION 'Admins and managers cannot change their own role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update all RLS policies to allow both admin and manager

-- Categories
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL 
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Items
DROP POLICY IF EXISTS "Admins can manage items" ON items;
CREATE POLICY "Admins can manage items"
  ON items FOR ALL 
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Profiles - view all
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT 
  USING (is_admin_or_manager(auth.uid()));

-- Profiles - update any
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Orders - view all (admin/manager and staff)
DROP POLICY IF EXISTS "Admins and staff can view all orders" ON orders;
CREATE POLICY "Admins and staff can view all orders"
  ON orders FOR SELECT USING (
    is_admin_or_manager(auth.uid()) OR has_role(auth.uid(), 'staff')
  );

-- Orders - update (admin/manager can update any, staff only active)
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Loyalty ledger
DROP POLICY IF EXISTS "Admins can view all loyalty history" ON loyalty_ledger;
CREATE POLICY "Admins can view all loyalty history"
  ON loyalty_ledger FOR SELECT 
  USING (is_admin_or_manager(auth.uid()));

-- User roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL 
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Settings
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL 
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Beans
DROP POLICY IF EXISTS "Admins can manage beans" ON public.beans;
CREATE POLICY "Admins can manage beans"
  ON public.beans FOR ALL 
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Bean categories
DROP POLICY IF EXISTS "Admins can manage bean categories" ON public.bean_categories;
CREATE POLICY "Admins can manage bean categories"
  ON public.bean_categories FOR ALL 
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Promotions
DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;
CREATE POLICY "Admins can manage promotions"
  ON public.promotions FOR ALL 
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Issues - update (only admin/manager)
DROP POLICY IF EXISTS "Only admins update issues" ON public.issues;
CREATE POLICY "Only admins update issues"
  ON public.issues FOR UPDATE 
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Issues - insert/view (staff and admin/manager)
DROP POLICY IF EXISTS "Staff and admins can report issues" ON public.issues;
CREATE POLICY "Staff and admins can report issues"
  ON public.issues FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'staff') OR is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Staff and admins can view issues" ON public.issues;
CREATE POLICY "Staff and admins can view issues"
  ON public.issues FOR SELECT 
  USING (has_role(auth.uid(), 'staff') OR is_admin_or_manager(auth.uid()));

-- Refunds - view and create
DROP POLICY IF EXISTS "Admins can view refunds" ON public.refunds;
CREATE POLICY "Admins can view refunds"
  ON public.refunds FOR SELECT
  USING (is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Admins can create refunds" ON public.refunds;
CREATE POLICY "Admins can create refunds"
  ON public.refunds FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Audit log - view
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (is_admin_or_manager(auth.uid()));

-- Refund requests - view and update
DROP POLICY IF EXISTS "Admins can view all refund requests" ON public.refund_requests;
CREATE POLICY "Admins can view all refund requests"
  ON public.refund_requests FOR SELECT
  USING (is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Admins can update refund requests" ON public.refund_requests;
CREATE POLICY "Admins can update refund requests"
  ON public.refund_requests FOR UPDATE
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Shift notes - update (staff can update own, admin/manager can update any)
DROP POLICY IF EXISTS "Staff can update own notes" ON public.shift_notes;
CREATE POLICY "Staff can update own notes"
  ON public.shift_notes FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_admin_or_manager(auth.uid())
  );

-- Update process_refund function to allow manager
CREATE OR REPLACE FUNCTION process_refund(
  p_order_id UUID,
  p_refund_type TEXT,
  p_amount_cents INTEGER,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_refund_id UUID;
  v_order RECORD;
  v_user_id UUID;
  v_user_email TEXT;
  v_points_to_refund INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Verify user is admin or manager
  IF NOT is_admin_or_manager(v_user_id) THEN
    RAISE EXCEPTION 'Only admins and managers can process refunds';
  END IF;
  
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Validate refund amount
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;
  
  IF p_amount_cents > v_order.total_cents THEN
    RAISE EXCEPTION 'Refund amount cannot exceed order total';
  END IF;
  
  -- Insert refund record
  INSERT INTO public.refunds (
    order_id,
    refund_type,
    amount_cents,
    reason,
    notes,
    processed_by
  ) VALUES (
    p_order_id,
    p_refund_type,
    p_amount_cents,
    p_reason,
    p_notes,
    v_user_id
  ) RETURNING id INTO v_refund_id;
  
  -- Update order refund status
  UPDATE public.orders
  SET 
    refunded = (p_refund_type = 'full' OR (refund_amount_cents + p_amount_cents >= total_cents)),
    refund_amount_cents = refund_amount_cents + p_amount_cents,
    status = CASE 
      WHEN p_refund_type = 'full' OR (refund_amount_cents + p_amount_cents >= total_cents) THEN 'cancelled'
      ELSE status
    END
  WHERE id = p_order_id;
  
  -- Refund loyalty points if customer used points
  IF v_order.customer_id IS NOT NULL AND v_order.points_redeemed > 0 THEN
    -- Calculate proportional points to refund
    IF p_refund_type = 'full' THEN
      v_points_to_refund := v_order.points_redeemed;
    ELSE
      -- Proportional refund
      v_points_to_refund := ROUND((p_amount_cents::NUMERIC / v_order.total_cents::NUMERIC) * v_order.points_redeemed);
    END IF;
    
    IF v_points_to_refund > 0 THEN
      -- Add points back to customer
      UPDATE public.profiles 
      SET loyalty_points = loyalty_points + v_points_to_refund 
      WHERE id = v_order.customer_id;
      
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
      VALUES (v_order.customer_id, p_order_id, v_points_to_refund, 'Refund for order #' || SUBSTRING(p_order_id::TEXT, 1, 8));
    END IF;
  END IF;
  
  -- Create audit log entry
  INSERT INTO public.audit_log (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_email,
    changes,
    metadata
  ) VALUES (
    'order',
    p_order_id,
    CASE 
      WHEN p_refund_type = 'comp' THEN 'comp_applied'
      WHEN p_refund_type = 'full' THEN 'full_refund'
      ELSE 'partial_refund'
    END,
    v_user_id,
    v_user_email,
    jsonb_build_object(
      'before', jsonb_build_object(
        'refunded', v_order.refunded,
        'refund_amount_cents', v_order.refund_amount_cents
      ),
      'after', jsonb_build_object(
        'refunded', (p_refund_type = 'full' OR (v_order.refund_amount_cents + p_amount_cents >= v_order.total_cents)),
        'refund_amount_cents', v_order.refund_amount_cents + p_amount_cents
      )
    ),
    jsonb_build_object(
      'refund_id', v_refund_id,
      'refund_type', p_refund_type,
      'amount_cents', p_amount_cents,
      'reason', p_reason,
      'notes', p_notes,
      'points_refunded', v_points_to_refund
    )
  );
  
  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

