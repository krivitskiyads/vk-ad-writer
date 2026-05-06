import type { GenerationSettings } from "@/lib/generation-settings";

export type GeneratedAdText = {
  headline: string;
  body: string;
  cta: string;
  cta_button: string;
  segment_name: string;
  pain_point_addressed: string;
  funnel_stage: "cold" | "warm" | "hot" | string;
  text_format: "short" | "long" | string;
  approach: string;
  approach_explanation: string;
};

export type GeneratedTextsResponse = {
  texts: GeneratedAdText[];
};

export function isGeneratedTextsResponse(
  data: unknown
): data is GeneratedTextsResponse {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return Array.isArray(o.texts);
}

export type GeneratedTextBatch = {
  id: string;
  project_id: string;
  batch_number: number;
  texts: GeneratedAdText[];
  tokens_used: number | null;
  time_ms: number | null;
  model: string | null;
  settings_snapshot: GenerationSettings | null;
  run_context: string | null;
  feedback: string | null;
  created_at: string;
};
