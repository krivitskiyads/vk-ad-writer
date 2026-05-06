import { NextResponse, type NextRequest } from "next/server";

import {
  deleteProject,
  getProject,
  updateProject,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Project } from "@/lib/types/project";

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
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e) {
    console.error("[GET /api/projects/:id]", e);
    const message = e instanceof Error ? e.message : "Не удалось загрузить проект";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
  const fields: Partial<Pick<Project, "name" | "description">> = {};
  if (typeof b.name === "string") fields.name = b.name.trim();
  if (typeof b.description === "string" || b.description === null) {
    fields.description = (b.description as string | null) ?? null;
  }

  if (Object.keys(fields).length === 0) {
    try {
      const project = await getProject(id);
      if (!project) {
        return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
      }
      return NextResponse.json({ project });
    } catch (e) {
      console.error("[PATCH /api/projects/:id] getProject failed", e);
      const message =
        e instanceof Error ? e.message : "Не удалось загрузить проект";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const project = await updateProject(id, fields);
    return NextResponse.json({ project });
  } catch (e) {
    console.error("[PATCH /api/projects/:id]", e);
    const message = e instanceof Error ? e.message : "Не удалось обновить проект";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/projects/:id]", e);
    const message = e instanceof Error ? e.message : "Не удалось удалить проект";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
