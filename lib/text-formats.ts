import type { GenerationSettings } from "@/lib/generation-settings";

export type TextLength = "micro" | "short" | "long";

const TEXT_LENGTH_SET = new Set<TextLength>(["micro", "short", "long"]);

export function isTextLength(v: unknown): v is TextLength {
  return typeof v === "string" && TEXT_LENGTH_SET.has(v as TextLength);
}

export function parseTextFormatsArray(raw: unknown): TextLength[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: TextLength[] = [];
  for (const item of raw) {
    if (isTextLength(item) && !out.includes(item)) out.push(item);
  }
  return out.length > 0 ? out : null;
}

/**
 * Выбор массива длин для генерации: text_formats → fallback на legacy text_format.
 */
export function pickFormatsFromSettings(
  settings: Pick<GenerationSettings, "textFormats" | "textFormat">
): TextLength[] {
  const fromArray = settings.textFormats;
  if (Array.isArray(fromArray) && fromArray.length > 0) {
    const filtered = fromArray.filter(isTextLength);
    if (filtered.length > 0) return filtered;
  }

  const tf = settings.textFormat;
  if (tf === "micro") return ["micro"];
  if (tf === "short") return ["short"];
  if (tf === "long") return ["long"];
  if (tf === "mixed") return ["short", "long"];
  return ["short"];
}

export const TEXT_LENGTH_OPTIONS: Array<{
  value: TextLength;
  label: string;
  hint?: string;
}> = [
  {
    value: "micro",
    label: "Микро",
    hint: "80–200 символов — заголовок и призыв",
  },
  { value: "short", label: "Короткий", hint: "300–500 символов" },
  { value: "long", label: "Длинный", hint: "700–1200 символов" },
];

export function textLengthLabel(value: TextLength): string {
  return TEXT_LENGTH_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
