-- R13a: RLS для новых таблиц + дополнительная PERMISSIVE политика на projects
-- (старые политики НЕ удаляем, новые добавляем параллельно)

-- ============================================================================
-- workspaces
-- ============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- SELECT: видишь workspace, в котором ты участник
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members m 
    WHERE m.workspace_id = workspaces.id AND m.user_id = auth.uid()
  ));

-- INSERT: создавать может любой аутентифицированный, owner_id обязательно = auth.uid()
CREATE POLICY workspaces_insert ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: обновлять может только owner
CREATE POLICY workspaces_update ON public.workspaces
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

-- DELETE: удалять может только owner
CREATE POLICY workspaces_delete ON public.workspaces
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ============================================================================
-- workspace_members
-- ============================================================================
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- SELECT: видишь members workspace'ов, в которых сам участник
CREATE POLICY members_select ON public.workspace_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members m2 
    WHERE m2.workspace_id = workspace_members.workspace_id AND m2.user_id = auth.uid()
  ));

-- INSERT: добавлять может owner workspace'а
CREATE POLICY members_insert ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces w 
    WHERE w.id = workspace_id AND w.owner_id = auth.uid()
  ));

-- DELETE: удалять может owner или сам участник (выйти из workspace)
CREATE POLICY members_delete ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w 
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- workspace_invitations
-- ============================================================================
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: видит owner workspace, тот кто пригласил, или тот кому пригласили
CREATE POLICY invitations_select ON public.workspace_invitations
  FOR SELECT TO authenticated
  USING (
    invited_by = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.workspaces w 
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- INSERT: создавать может только owner workspace'а
CREATE POLICY invitations_insert ON public.workspace_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.workspaces w 
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- DELETE: отменить приглашение может owner или тот кто его создал
CREATE POLICY invitations_delete ON public.workspace_invitations
  FOR DELETE TO authenticated
  USING (
    invited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w 
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- UPDATE: для accepted_at — может тот кому пригласили (через токен)
-- В MVP можно обойтись DELETE + новой записью, оставим без UPDATE-политики

-- ============================================================================
-- projects: ДОПОЛНИТЕЛЬНАЯ PERMISSIVE политика (старая на user_id остаётся!)
-- ============================================================================

-- Любой участник workspace получает полный доступ к проектам workspace'а
-- Эта политика PERMISSIVE — она OR-объединяется со старой (user_id = auth.uid())
CREATE POLICY projects_workspace_access ON public.projects
  FOR ALL TO authenticated
  USING (
    workspace_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.workspace_members m 
      WHERE m.workspace_id = projects.workspace_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.workspace_members m 
      WHERE m.workspace_id = projects.workspace_id AND m.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
