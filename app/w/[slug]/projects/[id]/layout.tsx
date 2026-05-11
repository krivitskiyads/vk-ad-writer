import { notFound, redirect } from "next/navigation";

import { ProjectLayoutShell } from "@/components/project-layout-shell";
import {
  getCurrentUserRole,
  getProject,
  getProjectUsageSummaryByProjectId,
  listProjectFiles,
} from "@/lib/supabase/queries";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function WorkspaceProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; id: string }>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { slug, id } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) redirect("/projects");

  const project = await getProject(id);
  if (!project) notFound();
  if (project.workspace_id !== workspace.id) notFound();

  const workspaceProjectsHref = `/w/${workspace.slug}/projects`;
  const projectBasePath = `${workspaceProjectsHref}/${id}`;

  const [role, files, usageRow] = await Promise.all([
    getCurrentUserRole(),
    listProjectFiles(id, "material"),
    getProjectUsageSummaryByProjectId(id),
  ]);
  const isAdmin = role === "admin";

  let adminUsage: { total_cost_rub: number; request_count: number } | null = null;
  if (isAdmin && usageRow) {
    adminUsage = {
      total_cost_rub: usageRow.total_cost_rub,
      request_count: usageRow.request_count,
    };
  }

  return (
    <ProjectLayoutShell
      project={project}
      filesCount={files.length}
      isAdmin={isAdmin}
      adminUsage={adminUsage}
      workspaceProjectsHref={workspaceProjectsHref}
      projectBasePath={projectBasePath}
    >
      {children}
    </ProjectLayoutShell>
  );
}
