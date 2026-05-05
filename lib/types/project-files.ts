export type ProjectFileKind = "material" | "successful_text";

export type ProjectFile = {
  id: string;
  project_id: string;
  name: string;
  content: string | null;
  file_type: string | null;
  size_bytes: number | null;
  kind: ProjectFileKind;
  created_at: string;
};
