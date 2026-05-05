import { NextResponse, type NextRequest } from "next/server";

import { getKnowledgeByIds } from "@/lib/supabase/queries";

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const ids =
      typeof body === "object" &&
      body !== null &&
      "ids" in body &&
      Array.isArray((body as { ids: unknown }).ids)
        ? ((body as { ids: unknown[] }).ids.filter(
            (x): x is string => typeof x === "string"
          ) as string[])
        : null;

    if (!ids) {
      return NextResponse.json(
        { error: "ids must be array of strings" },
        { status: 400 }
      );
    }

    const entries = await getKnowledgeByIds(ids);
    return NextResponse.json({ entries });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
