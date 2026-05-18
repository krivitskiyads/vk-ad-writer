-- R19: multi-select длин текстов (text_formats)
-- Применить в Supabase SQL Editor до деплоя кода.

ALTER TABLE public.generation_settings
  ADD COLUMN IF NOT EXISTS text_formats text[] DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
