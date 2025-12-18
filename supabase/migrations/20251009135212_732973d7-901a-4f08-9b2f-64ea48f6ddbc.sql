-- Create enum types for order and payment status
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE payment_method AS ENUM ('card', 'cash');

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  image_url TEXT,
  allergens TEXT[],
  vegetarian BOOLEAN NOT NULL DEFAULT false,
  vegan BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  modifiers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  payment_method payment_method NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  pickup_time TIMESTAMPTZ,
  notes TEXT,
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create loyalty ledger table
CREATE TABLE loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles enum and table
CREATE TYPE app_role AS ENUM ('admin', 'staff', 'customer');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create settings table (singleton)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  points_per_euro INTEGER NOT NULL DEFAULT 10,
  cash_enabled BOOLEAN NOT NULL DEFAULT true,
  card_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO settings (opening_hours, tax_rate, points_per_euro) 
VALUES (
  '{"monday": {"open": "07:00", "close": "18:00"}, "tuesday": {"open": "07:00", "close": "18:00"}, "wednesday": {"open": "07:00", "close": "18:00"}, "thursday": {"open": "07:00", "close": "18:00"}, "friday": {"open": "07:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "20:00"}, "sunday": {"open": "08:00", "close": "18:00"}}'::jsonb,
  10.00,
  10
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign customer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'customer');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to check user role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for items (public read, admin write)
CREATE POLICY "Items are viewable by everyone"
  ON items FOR SELECT USING (true);

CREATE POLICY "Admins can manage items"
  ON items FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins and staff can view all orders"
  ON orders FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins and staff can update orders"
  ON orders FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')
  );

-- RLS Policies for loyalty ledger
CREATE POLICY "Users can view own loyalty history"
  ON loyalty_ledger FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all loyalty history"
  ON loyalty_ledger FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for settings (public read, admin write)
CREATE POLICY "Settings are viewable by everyone"
  ON settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_items_active ON items(active) WHERE active = true;
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_loyalty_ledger_customer_id ON loyalty_ledger(customer_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Seed data: Categories
INSERT INTO categories (name, slug, description, position) VALUES
('Coffee', 'coffee', 'Premium coffee drinks made with locally roasted beans', 1),
('Tea', 'tea', 'Artisanal tea selection from around the world', 2),
('Pastries', 'pastries', 'Freshly baked pastries every morning', 3),
('Sandwiches', 'sandwiches', 'Gourmet sandwiches with fresh ingredients', 4);

-- Seed data: Items
INSERT INTO items (category_id, name, slug, description, price_cents, allergens, vegetarian, vegan, modifiers) VALUES
-- Coffee
((SELECT id FROM categories WHERE slug = 'coffee'), 'Espresso', 'espresso', 'Rich and bold single shot', 280, '{}', true, true, '[{"name": "Size", "options": [{"label": "Single", "price": 0}, {"label": "Double", "price": 80}]}]'),
((SELECT id FROM categories WHERE slug = 'coffee'), 'Cappuccino', 'cappuccino', 'Perfect balance of espresso and steamed milk', 420, '{"milk"}', true, false, '[{"name": "Milk", "options": [{"label": "Whole", "price": 0}, {"label": "Oat", "price": 50}, {"label": "Almond", "price": 50}]}, {"name": "Size", "options": [{"label": "Regular", "price": 0}, {"label": "Large", "price": 70}]}]'),
((SELECT id FROM categories WHERE slug = 'coffee'), 'Latte', 'latte', 'Smooth espresso with velvety steamed milk', 450, '{"milk"}', true, false, '[{"name": "Milk", "options": [{"label": "Whole", "price": 0}, {"label": "Oat", "price": 50}, {"label": "Almond", "price": 50}]}, {"name": "Size", "options": [{"label": "Regular", "price": 0}, {"label": "Large", "price": 70}]}]'),
((SELECT id FROM categories WHERE slug = 'coffee'), 'Flat White', 'flat-white', 'Microfoam perfection with double ristretto', 440, '{"milk"}', true, false, '[{"name": "Milk", "options": [{"label": "Whole", "price": 0}, {"label": "Oat", "price": 50}]}]'),
((SELECT id FROM categories WHERE slug = 'coffee'), 'Americano', 'americano', 'Espresso with hot water', 350, '{}', true, true, '[{"name": "Size", "options": [{"label": "Regular", "price": 0}, {"label": "Large", "price": 60}]}]'),
-- Tea
((SELECT id FROM categories WHERE slug = 'tea'), 'English Breakfast', 'english-breakfast', 'Classic black tea blend', 320, '{}', true, true, '[]'),
((SELECT id FROM categories WHERE slug = 'tea'), 'Earl Grey', 'earl-grey', 'Black tea with bergamot', 320, '{}', true, true, '[]'),
((SELECT id FROM categories WHERE slug = 'tea'), 'Jasmine Green', 'jasmine-green', 'Delicate green tea with jasmine flowers', 340, '{}', true, true, '[]'),
((SELECT id FROM categories WHERE slug = 'tea'), 'Chamomile', 'chamomile', 'Soothing herbal infusion', 320, '{}', true, true, '[]'),
-- Pastries
((SELECT id FROM categories WHERE slug = 'pastries'), 'Croissant', 'croissant', 'Buttery and flaky French pastry', 380, '{"gluten", "milk"}', true, false, '[]'),
((SELECT id FROM categories WHERE slug = 'pastries'), 'Chocolate Croissant', 'chocolate-croissant', 'Croissant filled with dark chocolate', 420, '{"gluten", "milk"}', true, false, '[]'),
((SELECT id FROM categories WHERE slug = 'pastries'), 'Blueberry Muffin', 'blueberry-muffin', 'Moist muffin bursting with blueberries', 350, '{"gluten", "eggs", "milk"}', true, false, '[]'),
((SELECT id FROM categories WHERE slug = 'pastries'), 'Cinnamon Roll', 'cinnamon-roll', 'Soft roll with cinnamon and cream cheese frosting', 450, '{"gluten", "milk", "eggs"}', true, false, '[]'),
-- Sandwiches
((SELECT id FROM categories WHERE slug = 'sandwiches'), 'Turkey & Avocado', 'turkey-avocado', 'Roasted turkey with fresh avocado and greens', 780, '{"gluten"}', false, false, '[]'),
((SELECT id FROM categories WHERE slug = 'sandwiches'), 'Caprese', 'caprese', 'Fresh mozzarella, tomato, and basil', 720, '{"gluten", "milk"}', true, false, '[]'),
((SELECT id FROM categories WHERE slug = 'sandwiches'), 'Grilled Veggie', 'grilled-veggie', 'Seasonal grilled vegetables with hummus', 680, '{"gluten"}', true, true, '[]');