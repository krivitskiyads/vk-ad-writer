import { NextResponse, type NextRequest } from "next/server";

import { deleteCampaignFile } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await context.params;
  try {
    await deleteCampaignFile(fileId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/campaigns/:id/files/:fileId]", e);
    const message = e instanceof Error ? e.message : "Не удалось удалить файл";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
