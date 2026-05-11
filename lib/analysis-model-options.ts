export const ANALYSIS_MODEL_OPTIONS = [
  {
    id: "sonnet",
    apiModel: "claude-sonnet-4-6",
    label: "Оптимальная",
    description: "Баланс качества и скорости (~60–75 сек)",
    isDefault: true,
  },
  {
    id: "opus",
    apiModel: "claude-opus-4-6",
    label: "Зверь",
    description: "Глубокий анализ для сложных аудиторий (~90–120 сек)",
    isDefault: false,
  },
] as const;

export type AnalysisModelId = (typeof ANALYSIS_MODEL_OPTIONS)[number]["id"];

export function resolveAnalysisModel(id: string | null | undefined): string {
  const opt = ANALYSIS_MODEL_OPTIONS.find((o) => o.id === id);
  if (opt) return opt.apiModel;
  return (
    ANALYSIS_MODEL_OPTIONS.find((o) => o.isDefault)?.apiModel ??
    "claude-sonnet-4-6"
  );
}
