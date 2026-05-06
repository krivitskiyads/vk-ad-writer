import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type {
  KnowledgeBaseEntry,
  KnowledgeBaseSummary,
  SelectedTechniques,
} from "@/lib/types/knowledge-base";
import {
  dbRowToGenerationSettings,
  generationSettingsToDbRow,
  mergeGenerationSettings,
} from "@/lib/generation-settings-row";
import {
  type ProjectAnalysis,
  toProjectAnalysis,
  withStableSegmentIds,
} from "@/lib/types/project-analysis";
import type {
  Project,
  ProjectAnalysisStatus,
} from "@/lib/types/project";
import type { ProjectFile, ProjectFileKind } from "@/lib/types/project-files";
import type {
  GeneratedAdText,
  GeneratedTextBatch,
} from "@/lib/types/generated-texts";
import type { GenerationSettings } from "@/lib/generation-settings";
import type { ProjectUsageSummary } from "@/lib/types/project-usage";

const sb = () => createServerSupabase();

// ============================================================================
// Проекты
// ============================================================================

export async function listProjects(
  userId: string
): Promise<ProjectUsageSummary[]> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("project_usage_summary")
    .select("*")
    .eq("user_id", userId)
    .order("last_activity_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ProjectUsageSummary[];
}

export async function createProject(
  userId: string,
  data: { name: string; description?: string }
): Promise<Project> {
  const supabase = await sb();
  const { data: row, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: data.name,
      description: data.description ?? null,
      analysis: null,
      selected_techniques: null,
      analysis_status: "pending" satisfies ProjectAnalysisStatus,
    })
    .select("*")
    .single();
  if (error) throw error;
  return row as Project;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return (data as Project | null) ?? null;
}

export async function updateProject(
  projectId: string,
  fields: Partial<
    Pick<
      Project,
      | "name"
      | "description"
      | "analysis"
      | "selected_techniques"
      | "selected_segment_ids"
      | "analysis_status"
    >
  >
): Promise<Project> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("projects")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = await sb();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) throw error;
}

// ============================================================================
// Сегменты проекта
// ============================================================================

export async function updateProjectSegments(
  projectId: string,
  selectedSegmentIds: string[]
): Promise<Project> {
  const ids = Array.isArray(selectedSegmentIds)
    ? selectedSegmentIds.filter((x): x is string => typeof x === "string")
    : [];
  return updateProject(projectId, { selected_segment_ids: ids });
}

// ============================================================================
// Файлы проекта
// ============================================================================

export async function listProjectFiles(
  projectId: string,
  kind?: ProjectFileKind
): Promise<ProjectFile[]> {
  const supabase = await sb();
  let query = supabase
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (kind) {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProjectFile[];
}

export async function createProjectFile(
  projectId: string,
  data: {
    name: string;
    content: string | null;
    file_type: string | null;
    size_bytes: number | null;
    kind?: ProjectFileKind;
  }
): Promise<ProjectFile> {
  const supabase = await sb();
  const { data: row, error } = await supabase
    .from("project_files")
    .insert({
      project_id: projectId,
      name: data.name,
      content: data.content,
      file_type: data.file_type,
      size_bytes: data.size_bytes,
      kind: data.kind ?? "material",
    })
    .select("*")
    .single();
  if (error) throw error;
  return row as ProjectFile;
}

export async function deleteProjectFile(fileId: string): Promise<void> {
  const supabase = await sb();
  const { error } = await supabase
    .from("project_files")
    .delete()
    .eq("id", fileId);
  if (error) throw error;
}

// ============================================================================
// Анализ проекта (хелперы поверх updateProject)
// ============================================================================

export async function setProjectAnalysis(
  projectId: string,
  analysis: ProjectAnalysis,
  techniques: SelectedTechniques
): Promise<Project> {
  return updateProject(projectId, {
    analysis,
    selected_techniques: techniques,
    analysis_status: "ready",
  });
}

export async function setProjectAnalysisStatus(
  projectId: string,
  status: ProjectAnalysisStatus
): Promise<Project> {
  return updateProject(projectId, { analysis_status: status });
}

// ============================================================================
// Настройки проекта (1:1)
// ============================================================================

export async function getProjectSettings(
  projectId: string
): Promise<GenerationSettings | null> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("generation_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return dbRowToGenerationSettings((data as Record<string, unknown> | null) ?? null);
}

export async function upsertProjectSettings(
  projectId: string,
  settings: Partial<GenerationSettings>
): Promise<GenerationSettings> {
  const supabase = await sb();
  const existing = await getProjectSettings(projectId);
  const merged = mergeGenerationSettings(existing, settings);
  const row = generationSettingsToDbRow(merged);
  const { data, error } = await supabase
    .from("generation_settings")
    .upsert(
      {
        project_id: projectId,
        ...row,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    )
    .select("*")
    .single();
  if (error) throw error;
  const parsed = dbRowToGenerationSettings(data as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Не удалось прочитать сохранённые настройки");
  }
  return parsed;
}

// ============================================================================
// Тексты проекта (прогоны / батчи)
// ============================================================================

export async function listProjectTexts(
  projectId: string
): Promise<GeneratedTextBatch[]> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("generated_texts")
    .select("*")
    .eq("project_id", projectId)
    .order("batch_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GeneratedTextBatch[];
}

export async function saveProjectBatch(
  projectId: string,
  data: {
    texts: any[];
    settings_snapshot: GenerationSettings;
    run_context: string | null;
    model: string;
    batch_number: number;
  }
): Promise<GeneratedTextBatch> {
  const supabase = await sb();
  const { data: row, error } = await supabase
    .from("generated_texts")
    .insert({
      project_id: projectId,
      batch_number: data.batch_number,
      texts: data.texts,
      model: data.model,
      settings_snapshot: data.settings_snapshot,
      run_context: data.run_context,
      tokens_used: null,
      time_ms: null,
      feedback: null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return row as GeneratedTextBatch;
}

export async function deleteProjectBatch(
  projectId: string,
  batchId: string
): Promise<void> {
  const supabase = await sb();
  const { error } = await supabase
    .from("generated_texts")
    .delete()
    .eq("id", batchId)
    .eq("project_id", projectId);
  if (error) throw error;
}

export async function getProjectBatchCount(projectId: string): Promise<number> {
  const supabase = await sb();
  const { count, error } = await supabase
    .from("generated_texts")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) throw error;
  return count ?? 0;
}

export async function getProjectsBatchCounts(
  userId: string
): Promise<Record<string, number>> {
  const supabase = await sb();
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId);
  if (pErr) throw pErr;

  const ids = (projects ?? [])
    .map((p) => (p as { id: string }).id)
    .filter((x): x is string => typeof x === "string");

  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from("generated_texts")
    .select("project_id")
    .in("project_id", ids);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const id of ids) counts[id] = 0;
  for (const row of data ?? []) {
    const pid = (row as { project_id: string }).project_id;
    if (pid && pid in counts) counts[pid] += 1;
  }
  return counts;
}

// ============================================================================
// База знаний (без изменений)
// ============================================================================

export async function getKnowledgeMenu(): Promise<KnowledgeBaseSummary[]> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("knowledge_base")
    .select(
      "id, entry_type, title, short_description, applicable_to, tags, priority"
    )
    .eq("is_active", true)
    .order("priority", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KnowledgeBaseSummary[];
}

export async function getKnowledgeByIds(
  ids: string[]
): Promise<KnowledgeBaseEntry[]> {
  if (ids.length === 0) return [];
  const supabase = await sb();
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as KnowledgeBaseEntry[];
}

export async function getFullKnowledgeBase(): Promise<KnowledgeBaseEntry[]> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KnowledgeBaseEntry[];
}

// ============================================================================
// Сводка расходов по проектам
// ============================================================================

export async function getProjectsWithUsage(
  userId: string
): Promise<ProjectUsageSummary[]> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("project_usage_summary")
    .select("*")
    .eq("user_id", userId)
    .order("last_activity_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ProjectUsageSummary[];
}

// ============================================================================
// Профиль / роль
// ============================================================================

export async function getProfile() {
  const supabase = await sb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getCurrentUserRole(): Promise<"admin" | "user" | null> {
  const supabase = await sb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return ((data?.role as "admin" | "user") ?? null);
}
