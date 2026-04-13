/** Структура ответа аналитика (JSON из Claude). */
export type ProjectAnalysis = {
  business: {
    niche?: string;
    niche_category?: string;
    business_type?: string;
    geo?: string;
    average_check?: string;
    usp?: string[];
    description_summary?: string;
  };
  segments: AnalysisSegment[];
  positioning: {
    main_message?: string;
    tone_of_voice?: string;
    key_benefits?: string[];
  };
  warnings: string[];
};

export type AnalysisSegment = {
  name: string;
  description?: string;
  demographics?: {
    age_from?: number;
    age_to?: number;
    gender?: string;
    income?: string;
  };
  pain_points?: string[];
  desires?: string[];
  objections?: string[];
  triggers?: string[];
  priority?: string;
};

export function isProjectAnalysis(data: unknown): data is ProjectAnalysis {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.business === "object" &&
    o.business !== null &&
    Array.isArray(o.segments) &&
    typeof o.positioning === "object" &&
    o.positioning !== null &&
    Array.isArray(o.warnings)
  );
}
