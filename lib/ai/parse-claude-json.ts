/**
 * Извлекает JSON из ответа Claude:
 * — снимает markdown ```json ... ``` / ``` ... ```;
 * — находит корневой JSON-объект или массив по балансу скобок (учитывает строки);
 * — допускает пояснительный текст до/после JSON.
 */

function extractBestFencedBlock(text: string): string | null {
  const re = /```(?:json)?\s*\r?\n?([\s\S]*?)```/gi;
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return null;

  const scored = matches.map((m) => {
    const inner = m[1].trim();
    const startsJson =
      inner.startsWith("{") ||
      inner.startsWith("[") ||
      /^\s*[\[{]/.test(inner);
    return { inner, startsJson };
  });

  const preferred = scored.find((s) => s.startsJson) ?? scored[0];
  return preferred.inner;
}

/** Первая `{`, похожая на начало JSON-объекта (не «фигурная скобка в тексте»). */
function findLikelyJsonObjectStart(s: string): number {
  let i = 0;
  while (i < s.length) {
    const j = s.indexOf("{", i);
    if (j < 0) return -1;
    let k = j + 1;
    while (k < s.length && /\s/.test(s[k])) k++;
    if (k >= s.length) return j;
    const ch = s[k];
    if (ch === '"' || ch === "}") return j;
    i = j + 1;
  }
  return -1;
}

/** Баланс `{`…`}` с учётом строк JSON (кавычки и экранирование). */
function extractBalancedJsonObject(s: string): string | null {
  const start = findLikelyJsonObjectStart(s);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i];

    if (!inString) {
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0) {
          return s.slice(start, i + 1);
        }
      }
    } else {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
    }
  }

  return null;
}

/** Баланс `[`…`]` с учётом строк (вложенные объекты не трогаем по счётчику массива). */
function extractBalancedJsonArray(s: string): string | null {
  const start = s.indexOf("[");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i];

    if (!inString) {
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === "[") {
        depth++;
      } else if (c === "]") {
        depth--;
        if (depth === 0) {
          return s.slice(start, i + 1);
        }
      }
    } else {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
    }
  }

  return null;
}

function tryParseJson(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function parseJsonFromClaudeText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Не удалось разобрать JSON из ответа модели");
  }

  const fenced = extractBestFencedBlock(trimmed);
  const candidates: string[] = [trimmed];
  if (fenced && fenced !== trimmed) {
    candidates.unshift(fenced);
  }

  for (const candidate of candidates) {
    const direct = tryParseJson(candidate);
    if (direct !== null) return direct;

    const obj = extractBalancedJsonObject(candidate);
    if (obj) {
      const parsed = tryParseJson(obj);
      if (parsed !== null) return parsed;
    }

    const arr = extractBalancedJsonArray(candidate);
    if (arr) {
      const parsed = tryParseJson(arr);
      if (parsed !== null) return parsed;
    }

    const firstBrace = findLikelyJsonObjectStart(candidate);
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const sliced = candidate.slice(firstBrace, lastBrace + 1);
      const parsed = tryParseJson(sliced);
      if (parsed !== null) return parsed;
    }

    const firstBracket = candidate.indexOf("[");
    const lastBracket = candidate.lastIndexOf("]");
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      const sliced = candidate.slice(firstBracket, lastBracket + 1);
      const parsed = tryParseJson(sliced);
      if (parsed !== null) return parsed;
    }
  }

  throw new Error("Не удалось разобрать JSON из ответа модели");
}
