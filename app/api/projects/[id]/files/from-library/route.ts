import { NextResponse, type NextRequest } from "next/server";

import { attachWorkspaceMaterialsToProject } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

const JSON_UTF8 = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

export async function POST(request: NextRequest, context: RouteContext) {
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

  const { id: projectId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректное тело запроса" },
      { status: 400, headers: JSON_UTF8 }
    );
  }

  const rawIds = (body as { material_ids?: unknown }).material_ids;
  const material_ids = Array.isArray(rawIds)
    ? rawIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];

  if (material_ids.length === 0) {
    return NextResponse.json(
      { error: "Передайте непустой массив material_ids" },
      { status: 400, headers: JSON_UTF8 }
    );
  }

  try {
    const files = await attachWorkspaceMaterialsToProject(
      projectId,
      material_ids
    );
    return NextResponse.json({ files }, { status: 201, headers: JSON_UTF8 });
  } catch (e) {
    console.error("[POST /api/projects/:id/files/from-library]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось прикрепить материалы";
    const status =
      message.includes("не найден") || message.includes("не относятся")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status, headers: JSON_UTF8 });
  }
}
