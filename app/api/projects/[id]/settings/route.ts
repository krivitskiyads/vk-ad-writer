import { NextResponse, type NextRequest } from "next/server";

import { getProjectSettings, upsertProjectSettings } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

const DEFAULTS = {
  model: "claude-sonnet-4-6",
  count: 5,
  length: "medium" as const,
};

function lengthFromTextFormat(textFormat: unknown): "short" | "medium" | "long" {
  if (textFormat === "short") return "short";
  if (textFormat === "long") return "long";
  return "medium";
}

function textFormatFromLength(length: unknown): "short" | "mixed" | "long" {
  if (length === "short") return "short";
  if (length === "long") return "long";
  return "mixed";
}

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
    const settings = await getProjectSettings(id);
    if (!settings) {
      return NextResponse.json({
        project_id: id,
        model: DEFAULTS.model,
        count: DEFAULTS.count,
        length: DEFAULTS.length,
      });
    }
    return NextResponse.json({
      project_id: id,
      model: settings.model ?? DEFAULTS.model,
      count: settings.textCount ?? DEFAULTS.count,
      length: lengthFromTextFormat(settings.textFormat),
    });
  } catch (e) {
    console.error("[GET /api/projects/:id/settings]", e);
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

  const b = (body ?? {}) as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  if (b.model !== undefined) fields.model = b.model;
  if (b.count !== undefined) fields.textCount = b.count;
  if (b.length !== undefined) fields.textFormat = textFormatFromLength(b.length);

  if (Object.keys(fields).length === 0) {
    try {
      const current = await getProjectSettings(id);
      return NextResponse.json(
        current
          ? {
              project_id: id,
              model: current.model ?? DEFAULTS.model,
              count: current.textCount ?? DEFAULTS.count,
              length: lengthFromTextFormat(current.textFormat),
            }
          : { project_id: id, ...DEFAULTS }
      );
    } catch (e) {
      console.error("[PATCH /api/projects/:id/settings] getProjectSettings failed", e);
      const message =
        e instanceof Error ? e.message : "Не удалось загрузить настройки";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    // Значения trafficDestination/customWishes остаются как есть (merge сделает queries.ts).
    const updated = await upsertProjectSettings(id, fields as any);
    return NextResponse.json({
      project_id: id,
      model: updated.model ?? DEFAULTS.model,
      count: updated.textCount ?? DEFAULTS.count,
      length: lengthFromTextFormat(updated.textFormat),
    });
  } catch (e) {
    console.error("[PATCH /api/projects/:id/settings]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось сохранить настройки";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

