-- Add sold_out flag to items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS sold_out BOOLEAN NOT NULL DEFAULT false;

-- Promotions table
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percent','amount');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type discount_type NOT NULL DEFAULT 'percent',
  value_cents INTEGER NOT NULL DEFAULT 0 CHECK (value_cents >= 0),
  percent NUMERIC(5,2) DEFAULT 0 CHECK (percent >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_promotions_updated ON public.promotions;
CREATE TRIGGER trg_promotions_updated BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Promotions are viewable by everyone" ON public.promotions;
CREATE POLICY "Promotions are viewable by everyone" ON public.promotions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;
CREATE POLICY "Admins can manage promotions" ON public.promotions FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Staff/Admin issue reports
DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM ('open','reviewing','resolved','ignored');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  status issue_status NOT NULL DEFAULT 'open',
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_issues_updated ON public.issues;
CREATE TRIGGER trg_issues_updated BEFORE UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and admins can report issues" ON public.issues;
CREATE POLICY "Staff and admins can report issues" ON public.issues
  FOR INSERT WITH CHECK (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Staff and admins can view issues" ON public.issues;
CREATE POLICY "Staff and admins can view issues" ON public.issues
  FOR SELECT USING (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Only admins update issues" ON public.issues;
CREATE POLICY "Only admins update issues" ON public.issues
  FOR UPDATE USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

