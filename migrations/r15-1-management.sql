-- ============================================================================
-- R15.1: rename workspace, move project, project usage stats (SECURITY DEFINER)
-- ============================================================================

-- ============================================================================
-- 1. Переименовать workspace (только owner, slug не трогаем)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rename_workspace(
  p_workspace_id UUID,
  p_new_name TEXT
)
RETURNS public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  updated_workspace public.workspaces;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  
  IF p_new_name IS NULL OR length(trim(p_new_name)) < 2 THEN
    RAISE EXCEPTION 'Name must be at least 2 characters' USING ERRCODE = '22023';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = p_workspace_id AND owner_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Only workspace owner can rename' USING ERRCODE = '42501';
  END IF;
  
  UPDATE public.workspaces
  SET name = trim(p_new_name), updated_at = now()
  WHERE id = p_workspace_id
  RETURNING * INTO updated_workspace;
  
  RETURN updated_workspace;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_workspace(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 2. Перенести проект в другой workspace
-- ============================================================================
CREATE OR REPLACE FUNCTION public.move_project_to_workspace(
  p_project_id UUID,
  p_target_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  source_workspace_id UUID;
  target_slug TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  
  -- Текущий workspace проекта
  SELECT workspace_id INTO source_workspace_id
  FROM public.projects WHERE id = p_project_id;
  
  IF source_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Project not found or has no workspace' USING ERRCODE = '22023';
  END IF;
  
  -- Проверка: юзер owner ИСХОДНОГО workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = source_workspace_id AND owner_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Only owner of source workspace can move projects' USING ERRCODE = '42501';
  END IF;
  
  -- Проверка: юзер участник ЦЕЛЕВОГО workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_target_workspace_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'You must be member of target workspace' USING ERRCODE = '42501';
  END IF;
  
  -- Перенос
  UPDATE public.projects
  SET workspace_id = p_target_workspace_id, updated_at = now()
  WHERE id = p_project_id;
  
  -- Slug для редиректа
  SELECT slug INTO target_slug FROM public.workspaces WHERE id = p_target_workspace_id;
  
  RETURN jsonb_build_object(
    'moved', true,
    'target_workspace_slug', target_slug,
    'project_id', p_project_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_project_to_workspace(UUID, UUID) TO authenticated;

-- ============================================================================
-- 3. Статистика использования проекта (агрегированная по операциям)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_project_usage_stats(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  current_user_id UUID;
  project_ws_id UUID;
  totals JSONB;
  by_op JSONB;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  
  -- Проверка доступа
  SELECT workspace_id INTO project_ws_id
  FROM public.projects WHERE id = p_project_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = project_ws_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'No access to this project' USING ERRCODE = '42501';
  END IF;
  
  -- Общие суммы
  SELECT jsonb_build_object(
    'total_input_tokens', COALESCE(SUM(input_tokens), 0),
    'total_output_tokens', COALESCE(SUM(output_tokens), 0),
    'total_cost_usd', ROUND(COALESCE(SUM(cost_usd), 0)::numeric, 4),
    'total_cost_rub', ROUND(COALESCE(SUM(cost_rub), 0)::numeric, 2),
    'total_operations', COUNT(*)
  ) INTO totals
  FROM public.usage_log
  WHERE project_id = p_project_id;
  
  -- Разбивка по операциям
  SELECT COALESCE(jsonb_object_agg(operation, op_data), '{}'::jsonb) INTO by_op
  FROM (
    SELECT 
      operation::TEXT,
      jsonb_build_object(
        'count', COUNT(*),
        'input_tokens', SUM(input_tokens),
        'output_tokens', SUM(output_tokens),
        'cost_rub', ROUND(SUM(cost_rub)::numeric, 2)
      ) AS op_data
    FROM public.usage_log
    WHERE project_id = p_project_id
    GROUP BY operation
  ) sub;
  
  RETURN totals || jsonb_build_object('by_operation', by_op);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_usage_stats(UUID) TO authenticated;
