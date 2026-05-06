import { NextResponse, type NextRequest } from "next/server";

import { deleteProjectBatch } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string; batchId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, batchId } = await context.params;
  try {
    await deleteProjectBatch(id, batchId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/projects/:id/texts/:batchId]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось удалить прогон";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

