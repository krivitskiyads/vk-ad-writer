import { NextResponse, type NextRequest } from "next/server";

import { createCampaign, listCampaigns } from "@/lib/supabase/queries";
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
    const campaigns = await listCampaigns(id);
    return NextResponse.json({ campaigns });
  } catch (e) {
    console.error("[GET /api/projects/:id/campaigns]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось загрузить кампании";
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
  const description =
    typeof b.description === "string" ? b.description.trim() : undefined;

  if (!name) {
    return NextResponse.json({ error: "name обязателен" }, { status: 400 });
  }

  try {
    const campaign = await createCampaign(id, { name, description });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/projects/:id/campaigns]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось создать кампанию";
    const status = message.includes("Сначала выполните анализ") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
