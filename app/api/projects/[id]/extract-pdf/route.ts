import { NextResponse, type NextRequest } from "next/server";

import {
  extractPdfText,
  MAX_PDF_SIZE_BYTES,
} from "@/lib/ai/pdf-ocr";
import { getProject } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

const JSON_UTF8 = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: JSON_UTF8 }
    );
  }

  try {
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Проект не найден" },
        { status: 404, headers: JSON_UTF8 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Файл не передан" },
        { status: 400, headers: JSON_UTF8 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `PDF слишком большой (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Максимум 30MB.`,
        },
        { status: 400, headers: JSON_UTF8 }
      );
    }

    const pdfParse = (await import("pdf-parse-new")).default;
    const parsed = await pdfParse(buffer);
    const rawText = (parsed.text ?? "").trim();
    const numPages =
      typeof parsed.numpages === "number" && parsed.numpages > 0
        ? parsed.numpages
        : 1;

    const { text, method } = await extractPdfText(
      buffer,
      numPages,
      rawText,
      { projectId, userId: user.id }
    );

    return NextResponse.json(
      { text: text.trim(), method },
      { headers: JSON_UTF8 }
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не удалось прочитать PDF";
    console.error("[POST /api/projects/:id/extract-pdf]", e);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: JSON_UTF8 }
    );
  }
}
