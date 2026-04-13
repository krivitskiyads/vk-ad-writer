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

