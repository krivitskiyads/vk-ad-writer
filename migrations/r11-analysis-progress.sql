-- R11: добавляем поле для отслеживания времени старта анализа
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
