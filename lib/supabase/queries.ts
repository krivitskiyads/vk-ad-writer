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
import { type ProjectAnalysis } from "@/lib/types/project-analysis";
import type {
  Project,
  ProjectAnalysisStatus,
} from "@/lib/types/project";
import type { ProjectFile, ProjectFileKind } from "@/lib/types/project-files";
import type { GeneratedTextBatch } from "@/lib/types/generated-texts";
import type {
  MaterialTag,
  WorkspaceMaterial,
  WorkspaceMaterialSummary,
  WorkspaceMaterialWithAuthor,
} from "@/lib/types/workspace-materials";
import { normalizeMaterialTag } from "@/lib/types/workspace-materials";
import type { GenerationSettings } from "@/lib/generation-settings";
import type { ProjectUsageSummary } from "@/lib/types/project-usage";

const sb = () => createServerSupabase();

// ============================================================================
// Проекты
// ============================================================================

export async function listProjects(
  workspaceId: string
): Promise<ProjectUsageSummary[]> {
  const supabase = await sb();
  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("id, user_id, name, description, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (projectsError) throw projectsError;

  const ids = (projectRows ?? [])
    .map((r) => (r as { id: string }).id)
    .filter((x): x is string => typeof x === "string");

  let usageRows: ProjectUsageSummary[] = [];
  if (ids.length > 0) {
    const { data: usageData, error: usageError } = await supabase
      .from("project_usage_summary")
      .select("*")
      .in("project_id", ids);
    if (usageError) throw usageError;
    usageRows = (usageData ?? []) as ProjectUsageSummary[];
  }

  const usageByProjectId = new Map(
    usageRows.map((row) => [row.project_id, row])
  );

  const merged = (projectRows ?? []).map((row) => {
    const r = row as {
      id: string;
      user_id: string;
      name: string;
      description: string | null;
      updated_at: string;
    };
    const u = usageByProjectId.get(r.id);
    return {
      project_id: r.id,
      user_id: r.user_id,
      name: r.name,
      description: r.description,
      campaign_count: u?.campaign_count ?? 0,
      request_count: u?.request_count ?? 0,
      total_cost_usd: u?.total_cost_usd ?? 0,
      total_cost_rub: u?.total_cost_rub ?? 0,
      last_activity_at: u?.last_activity_at ?? r.updated_at,
    } satisfies ProjectUsageSummary;
  });

  merged.sort((a, b) => {
    const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
    const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
    return tb - ta;
  });

  return merged;
}

export async function createProject(
  userId: string,
  workspaceId: string,
  data: { name: string; description?: string }
): Promise<Project> {
  const supabase = await sb();
  const { data: row, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
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
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...(row as unknown as Project),
    workspace_id:
      typeof row.workspace_id === "string" ? row.workspace_id : null,
    analysisStartedAt:
      typeof row.analysis_started_at === "string" || row.analysis_started_at === null
        ? (row.analysis_started_at as string | null)
        : null,
  };
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

/**
 * Копирует материалы из библиотеки workspace в файлы проекта (kind = material).
 */
export async function attachWorkspaceMaterialsToProject(
  projectId: string,
  materialIds: string[]
): Promise<ProjectFile[]> {
  const unique = [
    ...new Set(
      materialIds.filter((x) => typeof x === "string" && x.trim().length > 0)
    ),
  ];
  if (unique.length === 0) return [];

  const project = await getProject(projectId);
  if (!project) throw new Error("Проект не найден");
  const workspaceId = project.workspace_id;
  if (!workspaceId) {
    throw new Error(
      "У проекта нет привязки к workspace — библиотека материалов недоступна"
    );
  }

  const supabase = await sb();
  const { data: rows, error } = await supabase
    .from("workspace_files")
    .select("id, workspace_id, name, content_text, file_extension")
    .in("id", unique)
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  const list = (rows ?? []) as Array<{
    id: string;
    workspace_id: string;
    name: string;
    content_text: string;
    file_extension: string;
  }>;

  if (list.length !== unique.length) {
    throw new Error(
      "Не все материалы найдены или они не относятся к workspace проекта"
    );
  }

  const byId = new Map(list.map((r) => [r.id, r]));
  const created: ProjectFile[] = [];

  for (const id of unique) {
    const row = byId.get(id);
    if (!row) {
      throw new Error("Не удалось сопоставить материалы");
    }
    const content = row.content_text ?? "";
    const sizeBytes = new TextEncoder().encode(content).length;
    const file = await createProjectFile(projectId, {
      name: row.name,
      content,
      file_type: row.file_extension,
      size_bytes: sizeBytes,
      kind: "material",
    });
    created.push(file);
  }

  return created;
}

function rowToWorkspaceMaterial(row: Record<string, unknown>): WorkspaceMaterial {
  const tokens = row.content_tokens;
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    name: String(row.name),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    tag: normalizeMaterialTag(row.tag),
    content_text: String(row.content_text),
    file_extension: String(row.file_extension),
    source_filename: String(row.source_filename),
    content_tokens:
      typeof tokens === "number" && Number.isFinite(tokens) ? tokens : null,
    created_by: String(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function authorByUserIdForWorkspace(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMaterialWithAuthor["author"]> {
  const supabase = await sb();
  const { data: members, error } = await supabase.rpc("get_workspace_members", {
    p_workspace_id: workspaceId,
  });
  if (error) throw error;
  type MemberRow = { user_id: string; email: string };
  const list = (members ?? []) as MemberRow[];
  const row = list.find((m) => String(m.user_id) === userId);
  if (!row?.email) return null;
  return { id: userId, email: row.email };
}

// ============================================================================
// Материалы workspace (библиотека файлов)
// ============================================================================

function rowToWorkspaceMaterialSummary(
  row: Record<string, unknown>,
  emailByUserId: Map<string, string>
): WorkspaceMaterialSummary {
  const tokens = row.content_tokens;
  const createdBy = String(row.created_by);
  const email = emailByUserId.get(createdBy);
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    name: String(row.name),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    tag: normalizeMaterialTag(row.tag),
    file_extension: String(row.file_extension),
    source_filename: String(row.source_filename),
    content_tokens:
      typeof tokens === "number" && Number.isFinite(tokens) ? tokens : null,
    created_by: createdBy,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    author: email ? { id: createdBy, email } : null,
  };
}

/** Список материалов без `content_text` (легче для диалогов). */
export async function listWorkspaceMaterialsSummary(
  workspaceId: string
): Promise<WorkspaceMaterialSummary[]> {
  const supabase = await sb();
  const { data: rows, error } = await supabase
    .from("workspace_files")
    .select(
      "id, workspace_id, name, description, tag, file_extension, source_filename, content_tokens, created_by, created_at, updated_at"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: members, error: memErr } = await supabase.rpc(
    "get_workspace_members",
    { p_workspace_id: workspaceId }
  );
  if (memErr) throw memErr;
  const emailByUserId = new Map<string, string>();
  for (const m of members ?? []) {
    const r = m as { user_id: string; email: string };
    emailByUserId.set(String(r.user_id), r.email);
  }

  return (rows ?? []).map((raw) =>
    rowToWorkspaceMaterialSummary(raw as Record<string, unknown>, emailByUserId)
  );
}

export async function listWorkspaceMaterials(
  workspaceId: string
): Promise<WorkspaceMaterialWithAuthor[]> {
  const supabase = await sb();
  const { data: rows, error } = await supabase
    .from("workspace_files")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: members, error: memErr } = await supabase.rpc(
    "get_workspace_members",
    { p_workspace_id: workspaceId }
  );
  if (memErr) throw memErr;
  const emailByUserId = new Map<string, string>();
  for (const m of members ?? []) {
    const r = m as { user_id: string; email: string };
    emailByUserId.set(String(r.user_id), r.email);
  }

  return (rows ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const mat = rowToWorkspaceMaterial(row);
    const email = emailByUserId.get(mat.created_by);
    return {
      ...mat,
      author: email ? { id: mat.created_by, email } : null,
    };
  });
}

export async function getWorkspaceMaterial(
  materialId: string
): Promise<WorkspaceMaterialWithAuthor | null> {
  const supabase = await sb();
  const { data: row, error } = await supabase
    .from("workspace_files")
    .select("*")
    .eq("id", materialId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const mat = rowToWorkspaceMaterial(row as Record<string, unknown>);
  const author = await authorByUserIdForWorkspace(mat.workspace_id, mat.created_by);
  return { ...mat, author };
}

export async function createWorkspaceMaterial(params: {
  workspaceId: string;
  name: string;
  description?: string | null;
  tag: MaterialTag;
  contentText: string;
  fileExtension: string;
  sourceFilename: string;
  contentTokens?: number | null;
}): Promise<WorkspaceMaterial> {
  const supabase = await sb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("workspace_files")
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      description: params.description ?? null,
      tag: params.tag,
      content_text: params.contentText,
      file_extension: params.fileExtension,
      source_filename: params.sourceFilename,
      content_tokens:
        params.contentTokens !== undefined && params.contentTokens !== null
          ? params.contentTokens
          : null,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToWorkspaceMaterial(data as Record<string, unknown>);
}

export async function deleteWorkspaceMaterial(materialId: string): Promise<void> {
  const supabase = await sb();
  const { error } = await supabase
    .from("workspace_files")
    .delete()
    .eq("id", materialId);
  if (error) throw error;
}

export async function updateWorkspaceMaterial(
  materialId: string,
  fields: {
    name?: string;
    description?: string | null;
    tag?: MaterialTag;
  }
): Promise<WorkspaceMaterial> {
  const supabase = await sb();
  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.tag !== undefined) patch.tag = fields.tag;

  const { data, error } = await supabase
    .from("workspace_files")
    .update(patch)
    .eq("id", materialId)
    .select("*")
    .single();
  if (error) throw error;
  return rowToWorkspaceMaterial(data as Record<string, unknown>);
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
    selected_segment_ids: [],
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
    texts: unknown[];
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
  workspaceId: string
): Promise<Record<string, number>> {
  const supabase = await sb();
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId);
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

export async function getProjectUsageSummaryByProjectId(
  projectId: string
): Promise<ProjectUsageSummary | null> {
  const supabase = await sb();
  const { data, error } = await supabase
    .from("project_usage_summary")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProjectUsageSummary | null) ?? null;
}

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
