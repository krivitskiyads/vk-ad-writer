import { notFound } from "next/navigation";

import { ProjectTextsTab } from "@/components/project-texts-tab";
import { getProject, getProjectSettings, listProjectTexts } from "@/lib/supabase/queries";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";

export default async function WorkspaceProjectTextsPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const [project, settings, batches] = await Promise.all([
    getProject(id),
    getProjectSettings(id),
    listProjectTexts(id),
  ]);
  if (!project) notFound();
  if (project.workspace_id !== workspace.id) notFound();

  const workspaceProjectsHref = `/w/${slug}/projects`;

  return (
    <ProjectTextsTab
      projectId={id}
      project={project}
      settings={settings}
      batches={batches}
      workspaceProjectsHref={workspaceProjectsHref}
    />
  );
}
