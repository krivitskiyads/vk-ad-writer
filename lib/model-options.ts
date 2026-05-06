import type { ClaudeModel } from "@/lib/generation-settings";

/** Внутренний ключ пресета (не показываем в UI). */
export type ModelPresetId = "fast" | "balanced" | "premium";

export const MODEL_PRESET_TO_CLAUDE: Record<ModelPresetId, ClaudeModel> = {
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-6",
  premium: "claude-opus-4-6",
};

export const PRODUCT_MODEL_OPTIONS: Array<{
  id: ModelPresetId;
  label: string;
  hint: string;
  recommended?: boolean;
}> = [
  {
    id: "fast",
    label: "Быстрая",
    hint: "Для черновиков, экономично",
  },
  {
    id: "balanced",
    label: "Оптимальная",
    hint: "Лучший баланс качества и скорости",
    recommended: true,
  },
  {
    id: "premium",
    label: "Максимум",
    hint: "Самые проработанные тексты, медленнее",
  },
];

export function claudeModelToPresetId(model?: string | null): ModelPresetId {
  const m = (model ?? "").toLowerCase();
  if (m.includes("haiku")) return "fast";
  if (m.includes("opus")) return "premium";
  return "balanced";
}

export function productLabelForModel(model?: string | null): string {
  const id = claudeModelToPresetId(model);
  return PRODUCT_MODEL_OPTIONS.find((o) => o.id === id)?.label ?? "Оптимальная";
}
