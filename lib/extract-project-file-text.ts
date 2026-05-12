import mammoth from "mammoth";

import { getFileExtension } from "@/lib/project-files";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);

/** Макс. длина одного поста из CSV; длиннее — обрезаем и дописываем «...». */
const MAX_CSV_POST_CHARS = 800;

function truncateCsvPostText(text: string): string {
  if (text.length <= MAX_CSV_POST_CHARS) return text;
  return text.slice(0, MAX_CSV_POST_CHARS) + "...";
}

export type ProjectFileTextResult =
  | { ok: true; content: string }
  | { ok: false; reason: "skipped" }
  | { ok: false; reason: "error"; message: string };

async function extractTextFromPdf(
  file: File,
  projectId?: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const url = projectId
    ? `/api/projects/${projectId}/extract-pdf`
    : "/api/extract-pdf";

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.error ?? "Ошибка извлечения текста из PDF";
    throw new Error(msg);
  }

  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}

export async function extractTextFromProjectFile(
  file: File,
  projectId?: string
): Promise<ProjectFileTextResult> {
  const ext = getFileExtension(file.name);

  if (IMAGE_EXT.has(ext)) {
    return { ok: false, reason: "skipped" };
  }

  try {
    if (ext === ".txt") {
      const content = (await file.text()).trim();
      return { ok: true, content };
    }

    if (ext === ".docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { ok: true, content: result.value.trim() };
    }

    if (ext === ".pdf") {
      const content = await extractTextFromPdf(file, projectId);
      if (!content) {
        return { ok: false, reason: "error", message: "PDF не содержит текста (возможно, это скан)" };
      }
      return { ok: true, content };
    }

    if (ext === ".csv") {
      const raw = await file.text();
      const lines = raw.split("\n");
      if (lines.length < 2) {
        return { ok: false, reason: "error", message: "CSV пустой" };
      }

      // Определяем разделитель: ; или ,
      const headerLine = lines[0];
      const delimiter = headerLine.includes(";") ? ";" : ",";

      // Находим индекс столбца "Текст"
      const headers = headerLine
        .split(delimiter)
        .map((h) => h.trim().replace(/^"|"$/g, "").replace(/^\uFEFF/, ""));
      const textIndex = headers.findIndex(
        (h) => h.toLowerCase() === "текст" || h.toLowerCase() === "text"
      );

      if (textIndex === -1) {
        // Если столбца "Текст" нет — возвращаем весь CSV как текст
        return { ok: true, content: raw.trim() };
      }

      // Простой парсинг CSV с учётом кавычек
      const texts: string[] = [];
      let currentLine = "";

      for (let i = 1; i < lines.length; i++) {
        currentLine += (currentLine ? "\n" : "") + lines[i];

        // Считаем кавычки — если нечётное количество, значит строка не закончена
        const quoteCount = (currentLine.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) continue;

        const fields: string[] = [];
        let field = "";
        let inQuotes = false;
        for (let j = 0; j < currentLine.length; j++) {
          const ch = currentLine[j];
          if (ch === '"') {
            if (inQuotes && currentLine[j + 1] === '"') {
              field += '"';
              j++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === delimiter && !inQuotes) {
            fields.push(field);
            field = "";
          } else {
            field += ch;
          }
        }
        fields.push(field);

        const text = fields[textIndex]?.trim();
        if (text) {
          texts.push(text);
        }

        currentLine = "";
      }

      if (texts.length === 0) {
        return { ok: false, reason: "error", message: "В CSV не найдены тексты" };
      }

      // Собираем все посты в один текст с разделителями
      const content = texts
        .map(
          (t, i) => `--- Пост ${i + 1} ---\n${truncateCsvPostText(t)}`
        )
        .join("\n\n");

      return { ok: true, content };
    }

    return { ok: false, reason: "skipped" };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не удалось прочитать файл";
    return { ok: false, reason: "error", message };
  }
}
