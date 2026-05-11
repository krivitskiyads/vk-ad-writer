import "server-only";

import { slugifyWorkspaceName } from "@/lib/slugify-workspace";
import type { Workspace } from "@/lib/types/workspace";
import { createServerSupabase } from "@/lib/supabase/server";

function rowToWorkspace(row: {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

/** Первый workspace, где пользователь — owner (личный / порядок создания). */
export async function getFirstOwnedWorkspaceSlug(
  userId: string
): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const row = data as { slug: string } | null;
  return row?.slug ?? null;
}

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select(`joined_at, workspaces!inner(id, name, slug, owner_id, created_at)`)
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    workspaces: {
      id: string;
      name: string;
      slug: string;
      owner_id: string;
      created_at: string;
    };
  }[];

  return rows.map((r) => rowToWorkspace(r.workspaces));
}

/** Workspace по slug (RLS: только участник workspace). */
export async function getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, owner_id, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToWorkspace(data as {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    created_at: string;
  });
}

export async function getWorkspaceSlugById(
  workspaceId: string
): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return (data as { slug: string } | null)?.slug ?? null;
}

async function pickUniqueSlug(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  base: string
): Promise<string> {
  let candidate = base;
  let n = 2;
  for (;;) {
    const { data } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error("Название workspace слишком короткое");
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const baseSlug = slugifyWorkspaceName(trimmed);
  const slug = await pickUniqueSlug(supabase, baseSlug);

  const { data: wsRow, error: wsErr } = await supabase
    .from("workspaces")
    .insert({
      name: trimmed,
      slug,
      owner_id: user.id,
    })
    .select("id, name, slug, owner_id, created_at")
    .single();
  if (wsErr) throw wsErr;

  const w = wsRow as {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    created_at: string;
  };

  const { error: memErr } = await supabase.from("workspace_members").insert({
    workspace_id: w.id,
    user_id: user.id,
    role: "owner",
  });
  if (memErr) throw memErr;

  return rowToWorkspace(w);
}
