import { NextResponse, type NextRequest } from "next/server";

import {
  getCampaignSettings,
  upsertCampaignSettings,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import type { GenerationSettings } from "@/lib/generation-settings";

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
    const settings = await getCampaignSettings(id);
    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[GET /api/campaigns/:id/settings]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось загрузить настройки";
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

  const fields = (body ?? {}) as Partial<GenerationSettings>;

  try {
    const settings = await upsertCampaignSettings(id, fields);
    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[PATCH /api/campaigns/:id/settings]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось сохранить настройки";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
