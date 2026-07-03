-- Trial ограничения (3 дни) — пусни в Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS znayko_count_today int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS znayko_reset_date date DEFAULT current_date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS essay_count int DEFAULT 0;

-- Всички съществуващи потребители без план → trial
UPDATE profiles SET plan = 'trial' WHERE plan IS NULL;
UPDATE profiles SET trial_started_at = now() WHERE trial_started_at IS NULL;
