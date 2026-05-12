import { notFound, redirect } from "next/navigation";

import { WorkspaceRenameForm } from "@/components/workspace-rename-form";
import { createServerSupabase } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";

export default async function WorkspaceSettingsPage({
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
  if (!workspace) notFound();

  const isOwner = user.id === workspace.ownerId;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Настройки workspace
        </h2>
        <WorkspaceRenameForm workspace={workspace} isOwner={isOwner} />
      </section>

      <div>
        <h1 className="notion-page-title">Настройки</h1>
        <p className="notion-page-subtitle">
          Workspace «{workspace.name}» · адрес /w/{workspace.slug} не меняется
        </p>
      </div>
    </div>
  );
}
