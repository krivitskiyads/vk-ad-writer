import { NextResponse, type NextRequest } from "next/server";

import {
  classifyMaterial,
  MATERIAL_TAG_CLASSIFIER_MODEL,
} from "@/lib/ai/material-tagger";
import { extractPdfText, MAX_PDF_SIZE_BYTES } from "@/lib/ai/pdf-ocr";
import {
  createWorkspaceMaterial,
  listWorkspaceMaterials,
  listWorkspaceMaterialsSummary,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";
import {
  normalizeMaterialTag,
  type MaterialTag,
} from "@/lib/types/workspace-materials";
import { writeUsageLog } from "@/lib/usage-log";

type RouteContext = { params: Promise<{ slug: string }> };

const JSON_UTF8 = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

function basenameFromPath(filename: string): string {
  return filename.replace(/^.*[/\\]/, "");
}

function extensionFromFilename(filename: string): string {
  const base = basenameFromPath(filename);
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1).toLowerCase() : "";
}

function stemFromFilename(filename: string): string {
  const base = basenameFromPath(filename);
  const i = base.lastIndexOf(".");
  return (i > 0 ? base.slice(0, i) : base).trim() || base;
}

/** Явно переданный тег; `null` — авто-классификация. */
function parseExplicitTagField(
  raw: FormDataEntryValue | null
): MaterialTag | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  return normalizeMaterialTag(t);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const summary = request.nextUrl.searchParams.get("summary") === "1";

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

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json(
      { error: "Нет доступа к workspace" },
      { status: 403, headers: JSON_UTF8 }
    );
  }

  try {
    const materials = summary
      ? await listWorkspaceMaterialsSummary(workspace.id)
      : await listWorkspaceMaterials(workspace.id);
    return NextResponse.json({ materials }, { headers: JSON_UTF8 });
  } catch (e) {
    console.error("[GET /api/workspaces/:slug/materials]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось загрузить материалы";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: JSON_UTF8 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

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

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json(
      { error: "Нет доступа к workspace" },
      { status: 403, headers: JSON_UTF8 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Ожидается multipart/form-data" },
      { status: 400, headers: JSON_UTF8 }
    );
  }

  const file = formData.get("file");
  const textRaw = formData.get("text_content");
  const nameRaw = formData.get("name");
  const descriptionRaw = formData.get("description");

  const nameOpt =
    typeof nameRaw === "string" ? nameRaw.trim() : "";
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim()
      ? descriptionRaw.trim()
      : null;
  const explicitTag = parseExplicitTagField(formData.get("tag"));

  const isFile = file instanceof File && file.size > 0;
  const textContent =
    typeof textRaw === "string" ? textRaw.trim() : "";

  if (!isFile && !textContent) {
    return NextResponse.json(
      { error: "Нужен файл или поле text_content" },
      { status: 400, headers: JSON_UTF8 }
    );
  }

  let contentText: string;
  let fileExtension: string;
  let sourceFilename: string;
  let displayName: string;
  let contentTokens: number | null = null;

  if (isFile && file instanceof File) {
    const ext = extensionFromFilename(file.name);
    if (!ext) {
      return NextResponse.json(
        { error: "unsupported file type" },
        { status: 400, headers: JSON_UTF8 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (ext === "pdf") {
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
      const ocr = await extractPdfText(buffer, numPages, rawText);
      contentText = ocr.text.trim();
      const usage =
        "inputTokens" in ocr && "outputTokens" in ocr
          ? (ocr.inputTokens ?? 0) + (ocr.outputTokens ?? 0)
          : 0;
      contentTokens = usage > 0 ? usage : null;
    } else if (ext === "csv" || ext === "txt") {
      const dec = new TextDecoder("utf-8", { fatal: false });
      contentText = dec.decode(buffer).trim();
    } else {
      return NextResponse.json(
        { error: "unsupported file type" },
        { status: 400, headers: JSON_UTF8 }
      );
    }

    fileExtension = ext;
    sourceFilename = file.name || `upload.${ext}`;
    displayName = nameOpt || stemFromFilename(file.name) || "Материал";
  } else {
    contentText = textContent;
    fileExtension = "txt";
    sourceFilename = nameOpt ? `${nameOpt}.txt` : "text-input.txt";
    displayName = nameOpt || "Текст";
  }

  if (!contentText) {
    return NextResponse.json(
      { error: "Пустое содержимое материала" },
      { status: 400, headers: JSON_UTF8 }
    );
  }

  let tag: MaterialTag;
  if (explicitTag !== null) {
    tag = explicitTag;
  } else {
    const { tag: classifiedTag, usage } = await classifyMaterial({
      contentText,
      fileExtension,
      sourceFilename,
    });
    tag = classifiedTag;
    await writeUsageLog({
      userId: user.id,
      projectId: null,
      operation: "tag_material",
      model: MATERIAL_TAG_CLASSIFIER_MODEL,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_tokens,
      cacheWriteTokens: usage.cache_creation_tokens,
    });
  }

  try {
    const material = await createWorkspaceMaterial({
      workspaceId: workspace.id,
      name: displayName,
      description,
      tag,
      contentText,
      fileExtension,
      sourceFilename,
      contentTokens,
    });
    return NextResponse.json({ material }, { status: 201, headers: JSON_UTF8 });
  } catch (e) {
    console.error("[POST /api/workspaces/:slug/materials]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось сохранить материал";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: JSON_UTF8 }
    );
  }
}
