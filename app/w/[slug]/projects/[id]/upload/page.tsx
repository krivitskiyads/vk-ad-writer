import { notFound } from "next/navigation";

import { ProjectUploadTab } from "@/components/project-upload-tab";
import { getProject, listProjectFiles } from "@/lib/supabase/queries";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";

export default async function WorkspaceProjectUploadPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const [project, materials, successfulTexts] = await Promise.all([
    getProject(id),
    listProjectFiles(id, "material"),
    listProjectFiles(id, "successful_text"),
  ]);

  if (!project) notFound();
  if (project.workspace_id !== workspace.id) notFound();

  return (
    <ProjectUploadTab
      projectId={id}
      project={project}
      materials={materials}
      successfulTexts={successfulTexts}
      projectBasePath={`/w/${slug}/projects/${id}`}
    />
  );
}
