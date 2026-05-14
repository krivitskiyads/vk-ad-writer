-- R16a, шаг 1: библиотека материалов workspace (workspace_files)

CREATE TABLE public.workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tag TEXT NOT NULL CHECK (tag IN (
    'brief',
    'product',
    'reviews',
    'cases',
    'audience',
    'competitors',
    'ready_texts',
    'messages',
    'posts',
    'other'
  )),
  content_text TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  content_tokens INTEGER,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_files_workspace_id ON public.workspace_files(workspace_id);
CREATE INDEX idx_workspace_files_created_by ON public.workspace_files(created_by);
CREATE INDEX idx_workspace_files_tag ON public.workspace_files(tag);

CREATE TRIGGER trg_workspace_files_updated_at
  BEFORE UPDATE ON public.workspace_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_files_member_access ON public.workspace_files
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_files.workspace_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_files.workspace_id AND m.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
