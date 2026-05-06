import type {
  ClaudeModel,
  GenerationSettings,
  TextFormat,
  TrafficDestination,
} from "@/lib/generation-settings";

const TONE_PREFIX = /^\[Тон речи:\s*([^\]]*)\]\s*\n?/;

export function splitToneFromCustomWishes(raw: string): {
  tone?: string;
  body: string;
} {
  const m = raw.match(TONE_PREFIX);
  if (!m) return { body: raw };
  const tone = m[1]?.trim();
  const body = raw.replace(TONE_PREFIX, "").trimStart();
  return { tone: tone || undefined, body };
}

export function mergeToneIntoCustomWishes(body: string, tone?: string): string {
  const trimmed = body.trimStart();
  if (!tone) return trimmed;
  return `[Тон речи:${tone}]\n${trimmed}`;
}

/** Читает строку generation_settings (snake или camel из PostgREST). */
export function dbRowToGenerationSettings(
  row: Record<string, unknown> | null | undefined
): GenerationSettings | null {
  if (!row) return null;
  const rawWishes = String(row.custom_wishes ?? row.customWishes ?? "");
  const { tone, body } = splitToneFromCustomWishes(rawWishes);
  const tf = (row.text_format ?? row.textFormat ?? "short") as string;
  const textFormat: TextFormat =
    tf === "long" || tf === "mixed" ? tf : "short";
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
    customWishes: body,
    model,
    ...(tone ? { tone } : {}),
  };
}

/** Готовит объект колонок для upsert в generation_settings. */
export function generationSettingsToDbRow(
  s: GenerationSettings
): Record<string, unknown> {
  const custom_wishes = mergeToneIntoCustomWishes(s.customWishes ?? "", s.tone);
  return {
    traffic_destination: s.trafficDestination,
    text_format: s.textFormat,
    text_count: s.textCount,
    custom_wishes,
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
    tone: patch.tone !== undefined ? patch.tone : base.tone,
  };
}
