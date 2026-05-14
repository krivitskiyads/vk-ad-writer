import { NextResponse, type NextRequest } from "next/server";

import {
  deleteWorkspaceMaterial,
  getWorkspaceMaterial,
  updateWorkspaceMaterial,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";
import {
  normalizeMaterialTag,
  type MaterialTag,
} from "@/lib/types/workspace-materials";

type RouteContext = { params: Promise<{ slug: string; materialId: string }> };

const JSON_UTF8 = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

function parsePatchFields(body: Record<string, unknown>): {
  name?: string;
  description?: string | null;
  tag?: MaterialTag;
} {
  const out: {
    name?: string;
    description?: string | null;
    tag?: MaterialTag;
  } = {};

  if ("name" in body) {
    if (typeof body.name !== "string") {
      throw new Error("name должен быть строкой");
    }
    const n = body.name.trim();
    if (!n) throw new Error("name не может быть пустым");
    out.name = n;
  }

  if ("description" in body) {
    if (body.description === null) {
      out.description = null;
    } else if (typeof body.description === "string") {
      const d = body.description.trim();
      out.description = d ? d : null;
    } else {
      throw new Error("description должен быть строкой или null");
    }
  }

  if ("tag" in body) {
    out.tag = normalizeMaterialTag(body.tag);
  }

  return out;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug, materialId } = await context.params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: JSON_UTF8 }
    );
  }

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json(
      { error: "Нет доступа к workspace" },
      { status: 403, headers: JSON_UTF8 }
    );
  }

  try {
    const material = await getWorkspaceMaterial(materialId);
    if (!material || material.workspace_id !== workspace.id) {
      return NextResponse.json(
        { error: "Материал не найден" },
        { status: 404, headers: JSON_UTF8 }
      );
    }
    return NextResponse.json({ material }, { headers: JSON_UTF8 });
  } catch (e) {
    console.error("[GET /api/workspaces/:slug/materials/:materialId]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось загрузить материал";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: JSON_UTF8 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug, materialId } = await context.params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: JSON_UTF8 }
    );
  }

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json(
      { error: "Нет доступа к workspace" },
      { status: 403, headers: JSON_UTF8 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректное тело запроса" },
      { status: 400, headers: JSON_UTF8 }
    );
  }

  const b = (body ?? {}) as Record<string, unknown>;
  let fields: ReturnType<typeof parsePatchFields>;
  try {
    fields = parsePatchFields(b);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Некорректные поля";
    return NextResponse.json({ error: msg }, { status: 400, headers: JSON_UTF8 });
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: "Укажите хотя бы одно поле: name, description, tag" },
      { status: 400, headers: JSON_UTF8 }
    );
  }

  try {
    const existing = await getWorkspaceMaterial(materialId);
    if (!existing || existing.workspace_id !== workspace.id) {
      return NextResponse.json(
        { error: "Материал не найден" },
        { status: 404, headers: JSON_UTF8 }
      );
    }

    const material = await updateWorkspaceMaterial(materialId, fields);
    const full = await getWorkspaceMaterial(material.id);
    return NextResponse.json(
      { material: full ?? { ...material, author: existing.author } },
      { headers: JSON_UTF8 }
    );
  } catch (e) {
    console.error("[PATCH /api/workspaces/:slug/materials/:materialId]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось обновить материал";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: JSON_UTF8 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { slug, materialId } = await context.params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: JSON_UTF8 }
    );
  }

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json(
      { error: "Нет доступа к workspace" },
      { status: 403, headers: JSON_UTF8 }
    );
  }

  try {
    const existing = await getWorkspaceMaterial(materialId);
    if (!existing || existing.workspace_id !== workspace.id) {
      return NextResponse.json(
        { error: "Материал не найден" },
        { status: 404, headers: JSON_UTF8 }
      );
    }

    await deleteWorkspaceMaterial(materialId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[DELETE /api/workspaces/:slug/materials/:materialId]", e);
    const message =
      e instanceof Error ? e.message : "Не удалось удалить материал";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: JSON_UTF8 }
    );
  }
}
