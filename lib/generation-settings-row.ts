import type {
  ClaudeModel,
  GenerationSettings,
  TextFormat,
  TrafficDestination,
} from "@/lib/generation-settings";

/** Читает строку generation_settings (snake или camel из PostgREST). */
export function dbRowToGenerationSettings(
  row: Record<string, unknown> | null | undefined
): GenerationSettings | null {
  if (!row) return null;
  const rawWishes = String(row.custom_wishes ?? row.customWishes ?? "");
  const tf = (row.text_format ?? row.textFormat ?? "short") as string;
  const textFormat: TextFormat =
    tf === "micro" || tf === "long" || tf === "mixed" ? tf : "short";
  const td = (row.traffic_destination ??
    row.trafficDestination ??
    "site") as TrafficDestination;
  const tc = Number(row.text_count ?? row.textCount ?? 3);
  const textCount =
    Number.isFinite(tc) && tc > 0 ? Math.min(10, Math.max(1, Math.floor(tc))) : 3;
  const modelRaw = row.model;
  const model =
    typeof modelRaw === "string" && modelRaw.trim()
      ? (modelRaw.trim() as ClaudeModel)
      : undefined;

  return {
    trafficDestination: td,
    textFormat,
    textCount,
    customWishes: rawWishes,
    model,
  };
}

/** Готовит объект колонок для upsert в generation_settings. */
export function generationSettingsToDbRow(
  s: GenerationSettings
): Record<string, unknown> {
  return {
    traffic_destination: s.trafficDestination,
    text_format: s.textFormat,
    text_count: s.textCount,
    custom_wishes: s.customWishes ?? "",
    model: s.model ?? null,
  };
}

export function mergeGenerationSettings(
  previous: GenerationSettings | null,
  patch: Partial<GenerationSettings>
): GenerationSettings {
  const base: GenerationSettings = previous ?? {
    trafficDestination: "site",
    textFormat: "short",
    textCount: 3,
    customWishes: "",
    model: "claude-sonnet-4-6",
  };
  return {
    trafficDestination:
      patch.trafficDestination ?? base.trafficDestination,
    textFormat: patch.textFormat ?? base.textFormat,
    textCount:
      typeof patch.textCount === "number" && Number.isFinite(patch.textCount)
        ? Math.min(10, Math.max(1, Math.floor(patch.textCount)))
        : base.textCount,
    customWishes:
      patch.customWishes !== undefined ? patch.customWishes : base.customWishes,
    model: patch.model !== undefined ? patch.model : base.model,
  };
}
