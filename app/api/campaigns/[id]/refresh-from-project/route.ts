import { NextResponse, type NextRequest } from "next/server";

import { refreshCampaignFromProject } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const campaign = await refreshCampaignFromProject(id);
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error("[POST /api/campaigns/:id/refresh-from-project]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось обновить кампанию из проекта";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
