import { NextResponse } from "next/server";

import { getFullKnowledgeBase } from "@/lib/supabase/queries";

export async function GET() {
  try {
    const entries = await getFullKnowledgeBase();
    return NextResponse.json({ entries });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
