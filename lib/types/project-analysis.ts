import type { SelectedTechniques } from "@/lib/types/knowledge-base";

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
  selected_techniques?: SelectedTechniques;
};

export type AnalysisSegment = {
  /** Стабильный id для выбора сегментов в кампаниях (генерируется при сохранении анализа). */
  id?: string;
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

/** Распаковывает JSON, если модель вернула строку вместо объекта. */
function unwrapStringJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const t = raw.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return raw;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return raw;
  }
}

/**
 * Достаёт объект анализа из ответа API:
 * 1) поле `analysis`, если оно не null/undefined;
 * 2) иначе объект без служебных ключей (`tokensUsed`, `timeMs`, `error`, `analysis`).
 */
export function pickAnalysisFromApiResponse(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return undefined;
  }
  const o = data as Record<string, unknown>;
  let candidate = o.analysis;

  if (candidate !== undefined && candidate !== null) {
    candidate = unwrapStringJson(candidate);

    // Если Claude вернул массив вместо объекта — отсекаем
    if (Array.isArray(candidate)) {
      console.warn("[pickAnalysis] analysis is an array (expected object), rejecting");
      candidate = undefined;
    }
  }

  if (
    candidate !== undefined &&
    candidate !== null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate)
  ) {
    return candidate;
  }

  // fallback: собираем объект из корневых ключей (без служебных)
  const { tokensUsed: _t, timeMs: _m, error: _e, analysis: _a, ...rest } = o;
  if (Object.keys(rest).length > 0) {
    const unwrapped = unwrapStringJson(rest);
    if (
      typeof unwrapped === "object" &&
      unwrapped !== null &&
      !Array.isArray(unwrapped)
    ) {
      return unwrapped;
    }
  }

  return undefined;
}

/** Минимальная проверка: есть объект business; segments/positioning/warnings опциональны. */
export function isProjectAnalysis(data: unknown): data is ProjectAnalysis {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const o = data as Record<string, unknown>;
  if (typeof o.business !== "object" || o.business === null) return false;
  if ("segments" in o && !Array.isArray(o.segments)) return false;
  if (
    "positioning" in o &&
    (typeof o.positioning !== "object" ||
      o.positioning === null ||
      Array.isArray(o.positioning))
  ) {
    return false;
  }
  if ("warnings" in o && !Array.isArray(o.warnings)) return false;
  return true;
}

/** Ослабленная проверка + значения по умолчанию для UI. */
export function toProjectAnalysis(data: unknown): ProjectAnalysis | null {
  if (!isProjectAnalysis(data)) return null;
  const o = data as Record<string, unknown>;
  return {
    business: o.business as ProjectAnalysis["business"],
    segments: Array.isArray(o.segments) ? (o.segments as AnalysisSegment[]) : [],
    positioning:
      typeof o.positioning === "object" &&
      o.positioning !== null &&
      !Array.isArray(o.positioning)
        ? (o.positioning as ProjectAnalysis["positioning"])
        : {},
    warnings: Array.isArray(o.warnings) ? (o.warnings as string[]) : [],
  };
}

/** Добавляет стабильные id сегментам (для выбора в кампаниях и PATCH). */
export function withStableSegmentIds(analysis: ProjectAnalysis): ProjectAnalysis {
  return {
    ...analysis,
    segments: analysis.segments.map((s, i) => ({
      ...s,
      id:
        typeof s.id === "string" && s.id.trim().length > 0
          ? s.id.trim()
          : `segment-${i}`,
    })),
  };
}
