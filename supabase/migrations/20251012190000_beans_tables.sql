-- Beans catalog
CREATE TABLE IF NOT EXISTS public.beans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_delta_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_delta_cents >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bean_categories (
  bean_id UUID NOT NULL REFERENCES public.beans(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (bean_id, category_id)
);

-- Timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_beans_updated ON public.beans;
CREATE TRIGGER trg_beans_updated BEFORE UPDATE ON public.beans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.beans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bean_categories ENABLE ROW LEVEL SECURITY;

-- Policies: beans readable by everyone; admin manage
DROP POLICY IF EXISTS "Beans are viewable by everyone" ON public.beans;
CREATE POLICY "Beans are viewable by everyone"
  ON public.beans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage beans" ON public.beans;
CREATE POLICY "Admins can manage beans"
  ON public.beans FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policies: bean_categories only admin manage, readable by everyone (optional)
DROP POLICY IF EXISTS "Bean categories viewable by everyone" ON public.bean_categories;
CREATE POLICY "Bean categories viewable by everyone"
  ON public.bean_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage bean categories" ON public.bean_categories;
CREATE POLICY "Admins can manage bean categories"
  ON public.bean_categories FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed common beans
INSERT INTO public.beans (name, price_delta_cents, active)
VALUES ('House Blend', 0, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.beans (name, price_delta_cents, active)
VALUES ('Ethiopia (Single Origin)', 50, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.beans (name, price_delta_cents, active)
VALUES ('Colombia (Single Origin)', 50, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.beans (name, price_delta_cents, active)
VALUES ('Decaf', 0, true)
ON CONFLICT (name) DO NOTHING;

