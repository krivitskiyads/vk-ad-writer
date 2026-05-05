import { NextResponse, type NextRequest } from "next/server";

import {
  createProjectFile,
  listProjectFiles,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ProjectFileKind } from "@/lib/types/project-files";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_KINDS: ReadonlyArray<ProjectFileKind> = [
  "material",
  "successful_text",
];

function parseKind(raw: unknown): ProjectFileKind | undefined {
  if (typeof raw !== "string") return undefined;
  return VALID_KINDS.includes(raw as ProjectFileKind)
    ? (raw as ProjectFileKind)
    : undefined;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get("kind"));

  try {
    const files = await listProjectFiles(id, kind);
    return NextResponse.json({ files });
  } catch (e) {
    console.error("[GET /api/projects/:id/files]", e);
    const message = e instanceof Error ? e.message : "Не удалось загрузить файлы";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name обязателен" }, { status: 400 });
  }

  const content = typeof b.content === "string" ? b.content : null;
  const file_type = typeof b.file_type === "string" ? b.file_type : null;
  const size_bytes =
    typeof b.size_bytes === "number" && Number.isFinite(b.size_bytes)
      ? b.size_bytes
      : null;
  const kind = parseKind(b.kind);

  try {
    const file = await createProjectFile(id, {
      name,
      content,
      file_type,
      size_bytes,
      kind,
    });
    return NextResponse.json({ file }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/projects/:id/files]", e);
    const message = e instanceof Error ? e.message : "Не удалось сохранить файл";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
