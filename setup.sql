-- ============================================================
-- Разбери.Ме — пълна база данни
-- Изпълни целия файл в Supabase → SQL Editor
-- ============================================================


-- ── 1. ТАБЛИЦИ ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email       text,
  full_name   text,
  role        text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'parent')),
  grade       int  CHECK (grade BETWEEN 4 AND 12),
  goal        text,
  plan        text NOT NULL DEFAULT 'free',
  is_admin    boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parent_child (
  parent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, child_id)
);

CREATE TABLE IF NOT EXISTS public.progress (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject    text NOT NULL,
  lesson     text NOT NULL,
  score      int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan         text NOT NULL DEFAULT 'student',
  price_eur    numeric NOT NULL DEFAULT 30,
  status       text NOT NULL DEFAULT 'active',
  started_at   timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_usage (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  model         text NOT NULL,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd      numeric(10,6) NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);


-- ── 2. RLS ───────────────────────────────────────────────────

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings     ENABLE ROW LEVEL SECURITY;


-- ── 3. HELPER ФУНКЦИЯ (без рекурсия) ────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── 4. RLS ПОЛИТИКИ — profiles ───────────────────────────────

DROP POLICY IF EXISTS "profiles_select_own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"         ON public.profiles;
DROP POLICY IF EXISTS "admins_read_all_profiles"   ON public.profiles;

-- Всеки вижда само своя профил
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- Всеки може да обновява само своя профил (не може да се прави admin)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = false);

-- Admin може всичко
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── 5. RLS ПОЛИТИКИ — останалите таблици ────────────────────

DROP POLICY IF EXISTS "progress_select_own"  ON public.progress;
DROP POLICY IF EXISTS "progress_insert_own"  ON public.progress;

CREATE POLICY "progress_select_own" ON public.progress
  FOR SELECT USING (auth.uid() = student_id OR public.is_admin());

CREATE POLICY "progress_insert_own" ON public.progress
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "subscriptions_admin" ON public.subscriptions;

CREATE POLICY "subscriptions_admin" ON public.subscriptions
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "api_usage_insert_own" ON public.api_usage;
DROP POLICY IF EXISTS "api_usage_admin_read" ON public.api_usage;

CREATE POLICY "api_usage_insert_own" ON public.api_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_usage_admin_read" ON public.api_usage
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "settings_public_read"  ON public.settings;
DROP POLICY IF EXISTS "settings_admin_write"  ON public.settings;

CREATE POLICY "settings_public_read" ON public.settings
  FOR SELECT USING (true);

CREATE POLICY "settings_admin_write" ON public.settings
  FOR ALL USING (public.is_admin());


-- ── 6. TRIGGER — нов потребител ──────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, plan, is_admin, created_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'student',
    'free',
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 7. НАЧАЛНИ ДАННИ — настройки ────────────────────────────

INSERT INTO public.settings (key, value) VALUES
  ('price_student',      '€30'),
  ('price_family',       '€50'),
  ('price_teacher',      'от €99'),
  ('price_teacher_note', 'Планът с учител започва от €99 и включва 1 среща месечно.<br>Допълнителни срещи: 2 / месец — от €149 &nbsp;·&nbsp; 4 / месец — от €249'),
  ('cost_hosting',       '0'),
  ('cost_supabase',      '0'),
  ('cost_api',           '0'),
  ('cost_teachers',      '0'),
  ('cost_other',         '0')
ON CONFLICT (key) DO NOTHING;


-- ── 8. ADMIN ПРОФИЛ ──────────────────────────────────────────

INSERT INTO public.profiles (id, email, full_name, role, plan, is_admin, created_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Admin'),
  'student',
  'free',
  true,
  now()
FROM auth.users
WHERE email = 'kirilmodev@gmail.com'
ON CONFLICT (id) DO UPDATE
  SET is_admin = true,
      plan     = 'free';
