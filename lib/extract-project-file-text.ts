import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { getFileExtension } from "@/lib/project-files";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);

export type ProjectFileTextResult =
  | { ok: true; content: string }
  | { ok: false; reason: "skipped" }
  | { ok: false; reason: "error"; message: string };

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
      const data = new Uint8Array(await file.arrayBuffer());
      const parser = new PDFParse({ data });
      try {
        const textResult = await parser.getText();
        const text = textResult.text.trim();
        await parser.destroy();
        return { ok: true, content: text };
      } catch (e) {
        try {
          await parser.destroy();
        } catch {
          /* ignore */
        }
        throw e;
      }
    }

    return { ok: false, reason: "skipped" };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не удалось прочитать файл";
    return { ok: false, reason: "error", message };
  }
}
