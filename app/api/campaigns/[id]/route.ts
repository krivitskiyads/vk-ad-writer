import { NextResponse, type NextRequest } from "next/server";

import {
  deleteCampaign,
  getCampaign,
  updateCampaign,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Campaign, CampaignStatus } from "@/lib/types/campaign";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES: ReadonlyArray<CampaignStatus> = ["draft", "active", "archived"];

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
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Кампания не найдена" }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error("[GET /api/campaigns/:id]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось загрузить кампанию";
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
  const fields: Partial<
    Pick<
      Campaign,
      "name" | "description" | "analysis_snapshot" | "techniques_snapshot" | "status"
    >
  > = {};
  if (typeof b.name === "string") fields.name = b.name.trim();
  if (typeof b.description === "string" || b.description === null) {
    fields.description = (b.description as string | null) ?? null;
  }
  if ("analysis_snapshot" in b) {
    fields.analysis_snapshot = b.analysis_snapshot as Campaign["analysis_snapshot"];
  }
  if ("techniques_snapshot" in b) {
    fields.techniques_snapshot = b.techniques_snapshot as Campaign["techniques_snapshot"];
  }
  if (typeof b.status === "string" && VALID_STATUSES.includes(b.status as CampaignStatus)) {
    fields.status = b.status as CampaignStatus;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    const campaign = await updateCampaign(id, fields);
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error("[PATCH /api/campaigns/:id]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось обновить кампанию";
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
    await deleteCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/campaigns/:id]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось удалить кампанию";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
