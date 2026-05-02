import { createClient } from "@/lib/supabase/client";
import type { ProjectAnalysis } from "@/lib/types/project-analysis";

const supabase = () => createClient();

// ── Проекты ──

export async function getProjects() {
  const { data, error } = await supabase()
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProject(id: string) {
  const { data, error } = await supabase()
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProject(name: string) {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase()
    .from("projects")
    .insert({ name, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase()
    .from("projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const { error } = await supabase().from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ── Файлы проекта ──

export async function getProjectFiles(projectId: string) {
  const { data, error } = await supabase()
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function saveProjectFile(
  projectId: string,
  fileName: string,
  content: string,
  fileSize: number
) {
  const { data, error } = await supabase()
    .from("project_files")
    .insert({
      project_id: projectId,
      file_name: fileName,
      content,
      file_size: fileSize,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProjectFile(fileId: string) {
  const { error } = await supabase()
    .from("project_files")
    .delete()
    .eq("id", fileId);
  if (error) throw error;
}

// ── Анализ ──

export async function saveAnalysis(
  projectId: string,
  analysis: ProjectAnalysis,
  selectedSegments: number[]
) {
  const { error } = await supabase()
    .from("projects")
    .update({
      analysis,
      selected_segments: selectedSegments,
      status: "analyzed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) throw error;
}

// ── Настройки генерации ──

export async function getGenerationSettings(projectId: string) {
  const { data, error } = await supabase()
    .from("generation_settings")
    .select("*")
    .eq("project_id", projectId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
}

export async function saveGenerationSettings(
  projectId: string,
  settings: {
    traffic_destination: string;
    text_format: string;
    text_count: number;
    custom_wishes: string;
    reference_texts: string;
    model: string;
  }
) {
  const { error } = await supabase()
    .from("generation_settings")
    .upsert(
      {
        project_id: projectId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    );
  if (error) throw error;
}

// ── Сгенерированные тексты ──

export async function getGeneratedTexts(projectId: string) {
  const { data, error } = await supabase()
    .from("generated_texts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function saveGeneratedTexts(
  projectId: string,
  texts: unknown[],
  tokensUsed: number,
  timeMs: number,
  model: string,
  feedback?: string
) {
  const { data: existing } = await supabase()
    .from("generated_texts")
    .select("batch_number")
    .eq("project_id", projectId)
    .order("batch_number", { ascending: false })
    .limit(1);

  const batchNumber = (existing?.[0]?.batch_number ?? 0) + 1;

  const { error } = await supabase()
    .from("generated_texts")
    .insert({
      project_id: projectId,
      batch_number: batchNumber,
      texts,
      tokens_used: tokensUsed,
      time_ms: timeMs,
      model,
      feedback,
    });
  if (error) throw error;

  await supabase()
    .from("projects")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", projectId);
}

// ── Usage log ──

export async function logUsage(params: {
  projectId: string;
  action: "analyze" | "generate" | "extract_pdf";
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  timeMs: number;
}) {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) return;

  await supabase().from("usage_log").insert({
    user_id: user.id,
    project_id: params.projectId,
    action: params.action,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    total_tokens: params.totalTokens,
    cost_usd: params.costUsd,
    time_ms: params.timeMs,
  });
}

export async function getUsageStats() {
  const { data, error } = await supabase()
    .from("usage_log")
    .select("action, total_tokens, cost_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

// writeUsageLog вынесён в отдельный server-only модуль lib/usage-log.ts —
// чтобы webpack не подтягивал next/headers в клиентский бандл через цепочку
// клиентских импортов queries.ts.

// ── Профиль ──

export async function getProfile() {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data;
}
