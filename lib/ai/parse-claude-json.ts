/**
 * Извлекает JSON из ответа Claude (убирает markdown-ограждения ```json ... ``` при необходимости).
 */
export function parseJsonFromClaudeText(text: string): unknown {
  const trimmed = text.trim();
  const fence =
    /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/im.exec(trimmed);
  let candidate = fence ? fence[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Не удалось разобрать JSON из ответа модели");
  }
}
