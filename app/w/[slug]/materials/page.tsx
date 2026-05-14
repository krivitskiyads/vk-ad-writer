import { redirect } from "next/navigation";

import { MaterialsList } from "@/components/materials-list";
import { listWorkspaceMaterials } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";

export default async function WorkspaceMaterialsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) redirect("/projects");

  const initialMaterials = await listWorkspaceMaterials(workspace.id);

  return (
    <MaterialsList workspaceSlug={slug} initialMaterials={initialMaterials} />
  );
}
