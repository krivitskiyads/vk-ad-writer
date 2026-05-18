import { NextResponse, type NextRequest } from "next/server";

import type { GenerationSettings } from "@/lib/generation-settings";
import {
  TRAFFIC_DESTINATION_OPTIONS,
  normalizeTrafficDestination,
} from "@/lib/traffic-options";
import {
  isTextLength,
  pickFormatsFromSettings,
  type TextLength,
} from "@/lib/text-formats";
import { getProjectSettings, upsertProjectSettings } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

const DEFAULTS = {
  model: "claude-sonnet-4-6",
  count: 5,
  length: "medium" as const,
};

const ALLOWED_LENGTH = new Set(["micro", "short", "medium", "long", "mixed"]);
const ALLOWED_TRAFFIC = new Set(TRAFFIC_DESTINATION_OPTIONS.map((o) => o.value));

function lengthFromTextFormat(
  textFormat: unknown
): "micro" | "short" | "medium" | "long" | "mixed" {
  if (textFormat === "micro") return "micro";
  if (textFormat === "short") return "short";
  if (textFormat === "long") return "long";
  if (textFormat === "mixed") return "mixed";
  return "medium";
}

function settingsToApiJson(
  id: string,
  settings: GenerationSettings | null
): Record<string, unknown> {
  if (!settings) {
    return {
      project_id: id,
      ...DEFAULTS,
      traffic_destination: "vk_subscribe",
      trafficDestination: "vk_subscribe",
      text_formats: ["short"],
    };
  }
  const normalizedTraffic = normalizeTrafficDestination(settings.trafficDestination);
  const textFormats = pickFormatsFromSettings(settings);
  return {
    project_id: id,
    model: settings.model ?? DEFAULTS.model,
    count: settings.textCount ?? DEFAULTS.count,
    length: lengthFromTextFormat(settings.textFormat),
    text_format: settings.textFormat,
    text_formats: textFormats,
    traffic_destination: normalizedTraffic,
    trafficDestination: normalizedTraffic,
    customWishes: settings.customWishes ?? "",
  };
}

function parseTextFormatsBody(raw: unknown): TextLength[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const out: TextLength[] = [];
  for (const item of raw) {
    if (!isTextLength(item)) return null;
    if (!out.includes(item)) out.push(item);
  }
  return out.length > 0 ? out : null;
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
    return NextResponse.json(settingsToApiJson(id, settings));
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
  const fields: Partial<GenerationSettings> = {};
  if (b.model !== undefined) fields.model = b.model as GenerationSettings["model"];
  if (b.count !== undefined) fields.textCount = b.count as number;

  if (b.text_formats !== undefined) {
    const parsed = parseTextFormatsBody(b.text_formats);
    if (!parsed) {
      return NextResponse.json(
        { error: "Некорректное значение text_formats" },
        { status: 400 }
      );
    }
    fields.textFormats = parsed;
  } else if (b.length !== undefined) {
    const len = b.length;
    if (typeof len !== "string" || !ALLOWED_LENGTH.has(len)) {
      return NextResponse.json(
        { error: "Некорректное значение length" },
        { status: 400 }
      );
    }
    if (len === "micro") fields.textFormats = ["micro"];
    else if (len === "short") fields.textFormats = ["short"];
    else if (len === "long") fields.textFormats = ["long"];
    else if (len === "mixed") fields.textFormats = ["short", "long"];
  }

  if (b.trafficDestination !== undefined) {
    const rawTraffic = b.trafficDestination;
    if (typeof rawTraffic !== "string") {
      return NextResponse.json(
        { error: "Некорректное значение trafficDestination" },
        { status: 400 }
      );
    }
    const normalizedTraffic = normalizeTrafficDestination(rawTraffic);
    if (!ALLOWED_TRAFFIC.has(normalizedTraffic)) {
      return NextResponse.json(
        { error: "Некорректное значение trafficDestination" },
        { status: 400 }
      );
    }
    fields.trafficDestination = normalizedTraffic;
  }
  if (b.customWishes !== undefined) {
    fields.customWishes =
      typeof b.customWishes === "string" ? b.customWishes : "";
  }

  if (Object.keys(fields).length === 0) {
    try {
      const current = await getProjectSettings(id);
      return NextResponse.json(settingsToApiJson(id, current));
    } catch (e) {
      console.error("[PATCH /api/projects/:id/settings] getProjectSettings failed", e);
      const message =
        e instanceof Error ? e.message : "Не удалось загрузить настройки";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const updated = await upsertProjectSettings(id, fields);
    return NextResponse.json(settingsToApiJson(id, updated));
  } catch (e) {
    console.error("[PATCH /api/projects/:id/settings]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось сохранить настройки";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
