-- ============================================================
-- История миграция — пусни в Supabase → SQL Editor
-- ============================================================

-- 1. Добави details колона в quiz_results
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS details jsonb;

-- 2. Създай essay_results таблица
CREATE TABLE IF NOT EXISTS public.essay_results (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_slug text NOT NULL,
  topic       text,
  total       int,
  details     jsonb,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.essay_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "essay_results_own" ON public.essay_results;
CREATE POLICY "essay_results_own" ON public.essay_results
  FOR ALL USING (auth.uid() = user_id);

-- 3. Знайко сесии
CREATE TABLE IF NOT EXISTS public.znayko_sessions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_slug text,
  started_at  timestamptz DEFAULT now()
);

ALTER TABLE public.znayko_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "znayko_sessions_own" ON public.znayko_sessions;
CREATE POLICY "znayko_sessions_own" ON public.znayko_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 4. Знайко съобщения
CREATE TABLE IF NOT EXISTS public.znayko_messages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  uuid REFERENCES public.znayko_sessions(id) ON DELETE CASCADE,
  role        text CHECK (role IN ('user', 'assistant')),
  content     text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.znayko_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "znayko_messages_own" ON public.znayko_messages;
CREATE POLICY "znayko_messages_own" ON public.znayko_messages
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.znayko_sessions WHERE user_id = auth.uid()
    )
  );
