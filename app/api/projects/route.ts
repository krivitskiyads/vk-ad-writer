import { NextResponse, type NextRequest } from "next/server";

import { createProject, listProjects } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await listProjects(user.id);
    return NextResponse.json({ projects });
  } catch (e) {
    console.error("[GET /api/projects]", e);
    const message = e instanceof Error ? e.message : "Не удалось загрузить проекты";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const description =
    typeof b.description === "string" ? b.description.trim() : undefined;

  if (!name) {
    return NextResponse.json({ error: "name обязателен" }, { status: 400 });
  }

  try {
    const project = await createProject(user.id, { name, description });
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/projects]", e);
    const message = e instanceof Error ? e.message : "Не удалось создать проект";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
