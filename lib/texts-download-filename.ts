/** Склонение «N текст / текста / текстов» по правилам русского языка. */
export function pluralizeTexts(count: number): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n1 === 1 && n !== 11) return `${count} текст`;
  if (n1 >= 2 && n1 <= 4 && (n < 12 || n > 14)) return `${count} текста`;
  return `${count} текстов`;
}

/** Убирает символы, недопустимые в имени файла. */
export function sanitizeFilenameSegment(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Имя .txt при скачивании выбранных текстов.
 * Один батч → «{проект} — генерация {N} ({count} текстов).txt»
 * Несколько батчей → «{проект} — выборка ({count} текстов).txt»
 */
export function buildTextsDownloadFilename(
  projectName: string,
  selectedCount: number,
  batchNumbers: number[]
): string {
  const safeName = sanitizeFilenameSegment(projectName) || "Проект";
  const countPart = pluralizeTexts(selectedCount);

  if (batchNumbers.length === 1) {
    return `${safeName} — генерация ${batchNumbers[0]} (${countPart}).txt`;
  }
  return `${safeName} — выборка (${countPart}).txt`;
}
