import mammoth from "mammoth";

import { getFileExtension } from "@/lib/project-files";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);

export type ProjectFileTextResult =
  | { ok: true; content: string }
  | { ok: false; reason: "skipped" }
  | { ok: false; reason: "error"; message: string };

async function extractTextFromPdf(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/extract-pdf", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.error ?? "Ошибка извлечения текста из PDF";
    throw new Error(msg);
  }

  const data = await res.json();
  return data.text ?? "";
}

export async function extractTextFromProjectFile(
  file: File
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
      const content = await extractTextFromPdf(file);
      if (!content) {
        return { ok: false, reason: "error", message: "PDF не содержит текста (возможно, это скан)" };
      }
      return { ok: true, content };
    }

    return { ok: false, reason: "skipped" };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не удалось прочитать файл";
    return { ok: false, reason: "error", message };
  }
}
