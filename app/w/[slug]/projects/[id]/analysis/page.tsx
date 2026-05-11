import { notFound } from "next/navigation";

import { AnalysisPoller } from "@/components/analysis-poller";
import { ProjectAnalysisTab } from "@/components/project-analysis-tab";
import { getProject } from "@/lib/supabase/queries";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceProjectAnalysisPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const project = await getProject(id);
  if (!project) notFound();
  if (project.workspace_id !== workspace.id) notFound();

  const projectBasePath = `/w/${slug}/projects/${id}`;

  return (
    <>
      {project.analysis_status === "analyzing" && <AnalysisPoller projectId={id} />}
      <ProjectAnalysisTab
        projectId={id}
        project={project}
        projectBasePath={projectBasePath}
      />
    </>
  );
}
