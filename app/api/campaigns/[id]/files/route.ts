import { NextResponse, type NextRequest } from "next/server";

import {
  createCampaignFile,
  listCampaignFiles,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const files = await listCampaignFiles(id);
    return NextResponse.json({ files });
  } catch (e) {
    console.error("[GET /api/campaigns/:id/files]", e);
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

  try {
    const file = await createCampaignFile(id, {
      name,
      content,
      file_type,
      size_bytes,
    });
    return NextResponse.json({ file }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/campaigns/:id/files]", e);
    const message = e instanceof Error ? e.message : "Не удалось сохранить файл";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
