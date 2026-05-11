-- R13a ROLLBACK: полностью откатить изменения R13a
-- Применять ТОЛЬКО если нужно вернуться к состоянию до R13a
-- Существующие projects.user_id и старые RLS остаются нетронутыми

-- 1. Удалить новые RLS на projects
DROP POLICY IF EXISTS projects_workspace_access ON public.projects;

-- 2. Удалить колонку workspace_id из projects
ALTER TABLE public.projects DROP COLUMN IF EXISTS workspace_id;

-- 3. Удалить таблицы (CASCADE удалит все RLS и данные)
DROP TABLE IF EXISTS public.workspace_invitations CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

NOTIFY pgrst, 'reload schema';
