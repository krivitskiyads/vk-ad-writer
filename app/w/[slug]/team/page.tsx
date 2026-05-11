import { redirect } from "next/navigation";

import { InvitationsList } from "@/components/invitations-list";
import { TeamInviteControls } from "@/components/invite-dialog";
import { MembersList } from "@/components/members-list";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function WorkspaceTeamPage({
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

  const isOwner = user.id === workspace.ownerId;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="notion-page-title">Команда</h1>
          <p className="notion-page-subtitle">
            Управляй участниками рабочего пространства
          </p>
        </div>
        {isOwner ? <TeamInviteControls workspaceId={workspace.id} /> : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Участники</h2>
        <MembersList
          workspaceId={workspace.id}
          currentUserId={user.id}
          isWorkspaceOwner={isOwner}
        />
      </section>

      {isOwner ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Приглашения
          </h2>
          <InvitationsList workspaceId={workspace.id} />
        </section>
      ) : null}
    </div>
  );
}
