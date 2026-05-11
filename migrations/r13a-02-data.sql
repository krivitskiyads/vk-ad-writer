-- R13a: создаём personal workspace для каждого юзера и переносим его проекты

-- 1. Personal workspace для каждого юзера, у которого ещё нет ни одного workspace
INSERT INTO public.workspaces (id, name, slug, owner_id)
SELECT 
  gen_random_uuid(),
  'Личное',
  'personal-' || substring(u.id::text, 1, 8),
  u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.owner_id = u.id
);

-- 2. Owner-membership для создателя каждого workspace
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members m 
  WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
);

-- 3. Заполнить projects.workspace_id у существующих проектов на основе user_id
UPDATE public.projects p
SET workspace_id = w.id
FROM public.workspaces w
WHERE w.owner_id = p.user_id
  AND p.workspace_id IS NULL;

-- Проверочный запрос: должны быть все проекты с заполненным workspace_id
-- SELECT COUNT(*) FROM public.projects WHERE workspace_id IS NULL;
-- Ожидается: 0 (если у всех проектов есть валидный user_id)
