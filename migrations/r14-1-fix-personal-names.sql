-- R14.1: исправить имена личных workspaces у юзеров, где name случайно равно slug
-- (это могло произойти если при signup новых юзеров auto-создание workspace
-- ставило slug в поле name)

UPDATE public.workspaces
SET
  name = 'Личное',
  updated_at = now()
WHERE
  slug LIKE 'personal-%'
  AND name != 'Личное';

-- Автосоздание личного workspace при появлении нового юзера (если ещё нет ни одного workspace)
CREATE OR REPLACE FUNCTION public.create_personal_workspace_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE owner_id = NEW.id LIMIT 1) THEN
    RETURN NEW;
  END IF;

  WITH w AS (
    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES (
      'Личное',
      'personal-' || substring(NEW.id::text, 1, 8),
      NEW.id
    )
    RETURNING id
  )
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT w.id, NEW.id, 'owner' FROM w;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_personal_workspace_on_user_signup ON auth.users;
CREATE TRIGGER create_personal_workspace_on_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_personal_workspace_for_user();

NOTIFY pgrst, 'reload schema';
