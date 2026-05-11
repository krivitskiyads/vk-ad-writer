import { redirect } from "next/navigation";

import { WorkspaceProvider } from "@/components/workspace-context";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types/workspace";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, slug, owner_id, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (wsError || !row) {
    redirect("/projects");
  }

  const { data: membership, error: memError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", row.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memError || !membership) {
    redirect("/projects");
  }

  const workspace: Workspace = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };

  return (
    <WorkspaceProvider workspace={workspace}>{children}</WorkspaceProvider>
  );
}
