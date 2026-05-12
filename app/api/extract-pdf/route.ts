import { NextResponse, type NextRequest } from "next/server";

import { MAX_PDF_SIZE_BYTES } from "@/lib/ai/pdf-ocr";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Файл не передан" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `PDF слишком большой (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Максимум 30MB.`,
        },
        { status: 400 }
      );
    }

    // Динамический импорт чтобы не тянуть в клиентский бандл
    const pdfParse = (await import("pdf-parse-new")).default;
    const result = await pdfParse(buffer);

    return NextResponse.json({
      text: result.text.trim(),
      method: "pdf-parse" as const,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не удалось прочитать PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
