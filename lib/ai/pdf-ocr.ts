import "server-only";

import { writeUsageLog } from "@/lib/usage-log";

/** Совпадает с `lib/model-options.ts` (fast) — нужен полный slug для API и `lib/pricing.ts`. */
const OCR_MODEL = "claude-haiku-4-5-20251001";
const MIN_CHARS_PER_PAGE = 100;
/** Лимит Anthropic API для PDF; проверяем до тяжёлого парсинга. */
export const MAX_PDF_SIZE_BYTES = 30 * 1024 * 1024;
const VISION_TIMEOUT_MS = 90_000;

export interface OcrResult {
  text: string;
  method: "pdf-parse" | "vision";
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Извлекает текст из PDF через Claude (документ PDF в запросе).
 * Fallback, когда pdf-parse даёт слишком мало текста.
 */
export async function extractPdfViaVision(
  pdfBuffer: Buffer,
  context?: { projectId: string; userId: string }
): Promise<OcrResult> {
  if (pdfBuffer.length > MAX_PDF_SIZE_BYTES) {
    throw new Error(
      `PDF слишком большой (${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB). Максимум 30MB.`
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не настроен");
  }

  const base64Pdf = pdfBuffer.toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: OCR_MODEL,
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf,
                },
              },
              {
                type: "text",
                text: "Извлеки весь текстовый контент из этого документа. Сохрани структуру (заголовки, абзацы, списки), но верни как обычный текст без markdown-разметки. Если в документе есть таблицы — конвертируй их в текст с разделителями. Если есть изображения с подписями — извлеки и их.",
              },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        "Распознавание текста заняло слишком много времени. Попробуйте файл меньшего размера или разбейте PDF на части."
      );
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка распознавания PDF: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text =
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    throw new Error(
      "Не удалось извлечь текст из PDF. Возможно, файл повреждён или содержит только изображения низкого качества."
    );
  }

  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;

  if (context) {
    const logged = await writeUsageLog({
      userId: context.userId,
      projectId: context.projectId,
      operation: "ocr_pdf",
      model: OCR_MODEL,
      inputTokens,
      outputTokens,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    if (!logged) {
      console.error("[ocr_pdf] writeUsageLog returned null");
    }
  }

  return { text, method: "vision", inputTokens, outputTokens };
}

/**
 * Гибридное извлечение: pdf-parse, при недостаточном тексте — запрос к API с PDF.
 */
export async function extractPdfText(
  pdfBuffer: Buffer,
  numPages: number,
  parsedText: string,
  context?: { projectId: string; userId: string }
): Promise<OcrResult> {
  const pages = Math.max(1, numPages);
  const expectedMinChars = pages * MIN_CHARS_PER_PAGE;
  const hasEnoughText = parsedText.trim().length >= expectedMinChars;

  if (hasEnoughText) {
    return { text: parsedText, method: "pdf-parse" };
  }

  console.log(
    `[extract-pdf] pdf-parse дал ${parsedText.length} символов на ${pages} стр. — недостаточно, переходим к распознаванию через API`
  );

  return extractPdfViaVision(pdfBuffer, context);
}
