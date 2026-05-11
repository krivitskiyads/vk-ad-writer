-- ============================================================================
-- R14: SECURITY DEFINER функции для управления командой
-- ============================================================================

-- 1. Пригласить юзера в workspace по email
-- Если email уже зарегистрирован → мгновенно добавить в members
-- Если нет → создать приглашение, вернуть токен
CREATE OR REPLACE FUNCTION public.invite_to_workspace(
  p_workspace_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  invited_user_id UUID;
  new_token TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  
  -- Проверка: текущий юзер — owner workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = p_workspace_id AND owner_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Only workspace owner can invite' USING ERRCODE = '42501';
  END IF;
  
  -- Валидация email
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email' USING ERRCODE = '22023';
  END IF;
  
  p_email := lower(trim(p_email));
  
  -- Уже member?
  IF EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN auth.users u ON u.id = wm.user_id
    WHERE wm.workspace_id = p_workspace_id AND lower(u.email) = p_email
  ) THEN
    RAISE EXCEPTION 'User already member of this workspace' USING ERRCODE = '23505';
  END IF;
  
  -- Юзер существует?
  SELECT id INTO invited_user_id 
  FROM auth.users 
  WHERE lower(email) = p_email;
  
  IF invited_user_id IS NOT NULL THEN
    -- Мгновенное добавление
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (p_workspace_id, invited_user_id, 'member');
    
    RETURN jsonb_build_object(
      'type', 'added',
      'user_id', invited_user_id,
      'email', p_email
    );
  ELSE
    -- Удаляем старые активные приглашения для этого email в этом workspace
    DELETE FROM public.workspace_invitations 
    WHERE workspace_id = p_workspace_id 
      AND lower(email) = p_email 
      AND accepted_at IS NULL;
    
    -- Создаём новое
    INSERT INTO public.workspace_invitations (workspace_id, email, role, invited_by)
    VALUES (p_workspace_id, p_email, 'member', current_user_id)
    RETURNING token INTO new_token;
    
    RETURN jsonb_build_object(
      'type', 'invited',
      'token', new_token,
      'email', p_email
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_to_workspace(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 2. Принять приглашение (по токену)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  invitation RECORD;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  
  SELECT * INTO invitation
  FROM public.workspace_invitations
  WHERE token = p_token AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already accepted invitation' USING ERRCODE = '22023';
  END IF;
  
  IF invitation.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired' USING ERRCODE = '22023';
  END IF;
  
  -- Уже member?
  IF EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = invitation.workspace_id AND user_id = current_user_id
  ) THEN
    -- Просто отмечаем приглашение принятым
    UPDATE public.workspace_invitations
    SET accepted_at = now() WHERE id = invitation.id;
    
    RETURN jsonb_build_object(
      'workspace_id', invitation.workspace_id,
      'already_member', true
    );
  END IF;
  
  -- Добавляем как member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (invitation.workspace_id, current_user_id, invitation.role);
  
  -- Отмечаем принятым
  UPDATE public.workspace_invitations
  SET accepted_at = now() WHERE id = invitation.id;
  
  RETURN jsonb_build_object(
    'workspace_id', invitation.workspace_id,
    'already_member', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO authenticated;

-- ============================================================================
-- 3. Preview приглашения (для отображения на /invitations/[token])
-- Доступно anon-юзерам тоже — чтобы могли увидеть инфо до логина
-- ============================================================================
CREATE OR REPLACE FUNCTION public.preview_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  invitation RECORD;
  ws_name TEXT;
  ws_slug TEXT;
  inviter_email TEXT;
BEGIN
  SELECT * INTO invitation
  FROM public.workspace_invitations
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  
  IF invitation.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_accepted');
  END IF;
  
  IF invitation.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  
  SELECT name, slug INTO ws_name, ws_slug
  FROM public.workspaces WHERE id = invitation.workspace_id;
  
  SELECT email::TEXT INTO inviter_email
  FROM auth.users WHERE id = invitation.invited_by;
  
  RETURN jsonb_build_object(
    'valid', true,
    'workspace_name', ws_name,
    'workspace_slug', ws_slug,
    'email', invitation.email,
    'inviter_email', inviter_email,
    'role', invitation.role,
    'expires_at', invitation.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_invitation(TEXT) TO anon, authenticated;

-- ============================================================================
-- 4. Получить список участников workspace (с email через JOIN на auth.users)
-- Доступно только участникам workspace
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_workspace_members(p_workspace_id UUID)
RETURNS TABLE(
  member_id UUID,
  user_id UUID,
  email TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    wm.id::UUID AS member_id,
    wm.user_id::UUID,
    u.email::TEXT,
    wm.role::TEXT,
    wm.joined_at::TIMESTAMPTZ
  FROM public.workspace_members wm
  JOIN auth.users u ON u.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id
    AND EXISTS (
      SELECT 1 FROM public.workspace_members me
      WHERE me.workspace_id = p_workspace_id AND me.user_id = auth.uid()
    )
  ORDER BY 
    CASE wm.role WHEN 'owner' THEN 0 ELSE 1 END,
    wm.joined_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_members(UUID) TO authenticated;

-- ============================================================================
-- 5. Получить список pending приглашений (для owner)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_workspace_invitations(p_workspace_id UUID)
RETURNS TABLE(
  invitation_id UUID,
  email TEXT,
  role TEXT,
  token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    wi.id::UUID AS invitation_id,
    wi.email::TEXT,
    wi.role::TEXT,
    wi.token::TEXT,
    wi.expires_at::TIMESTAMPTZ,
    wi.created_at::TIMESTAMPTZ
  FROM public.workspace_invitations wi
  WHERE wi.workspace_id = p_workspace_id
    AND wi.accepted_at IS NULL
    AND wi.expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = p_workspace_id AND w.owner_id = auth.uid()
    )
  ORDER BY wi.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_invitations(UUID) TO authenticated;

-- ============================================================================
-- 6. Отменить приглашение
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  inv_workspace_id UUID;
  inv_invited_by UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  
  SELECT workspace_id, invited_by 
  INTO inv_workspace_id, inv_invited_by
  FROM public.workspace_invitations
  WHERE id = p_invitation_id AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '22023';
  END IF;
  
  -- Owner workspace ИЛИ тот кто пригласил
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = inv_workspace_id AND owner_id = current_user_id
  ) AND inv_invited_by != current_user_id THEN
    RAISE EXCEPTION 'Only workspace owner or inviter can cancel' USING ERRCODE = '42501';
  END IF;
  
  DELETE FROM public.workspace_invitations WHERE id = p_invitation_id;
  
  RETURN jsonb_build_object('cancelled', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_invitation(UUID) TO authenticated;

-- ============================================================================
-- 7. Удалить участника workspace
-- ============================================================================
CREATE OR REPLACE FUNCTION public.remove_workspace_member(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  is_owner_of_workspace BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  
  is_owner_of_workspace := EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = p_workspace_id AND owner_id = current_user_id
  );
  
  -- Удалять может: owner workspace ИЛИ юзер сам себя
  IF NOT is_owner_of_workspace AND current_user_id != p_user_id THEN
    RAISE EXCEPTION 'Only workspace owner can remove members' USING ERRCODE = '42501';
  END IF;
  
  -- Owner не может удалить сам себя из своего workspace
  -- (нужно сначала удалить workspace или передать владение)
  IF current_user_id = p_user_id AND is_owner_of_workspace THEN
    RAISE EXCEPTION 'Workspace owner cannot leave. Delete workspace instead.' USING ERRCODE = '42501';
  END IF;
  
  DELETE FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  RETURN jsonb_build_object('removed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_workspace_member(UUID, UUID) TO authenticated;
