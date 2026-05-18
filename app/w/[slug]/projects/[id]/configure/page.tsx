import { notFound } from "next/navigation";

import { ProjectConfigureTab } from "@/components/project-configure-tab";
import { pickFormatsFromSettings } from "@/lib/text-formats";
import { getProject, getProjectSettings } from "@/lib/supabase/queries";
import { getWorkspaceBySlug } from "@/lib/supabase/workspaces";

export default async function WorkspaceProjectConfigurePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const [project, settings] = await Promise.all([
    getProject(id),
    getProjectSettings(id),
  ]);
  if (!project) notFound();
  if (project.workspace_id !== workspace.id) notFound();

  const projectBasePath = `/w/${slug}/projects/${id}`;

  return (
    <ProjectConfigureTab
      projectId={id}
      project={project}
      initialSettings={
        settings
          ? {
              project_id: id,
              model: settings.model ?? "claude-sonnet-4-6",
              count: settings.textCount ?? 5,
              text_formats: pickFormatsFromSettings(settings),
              hasPersistedTextFormats: Boolean(
                settings.textFormats && settings.textFormats.length > 0
              ),
              trafficDestination: settings.trafficDestination,
              customWishes: settings.customWishes ?? "",
            }
          : null
      }
      projectBasePath={projectBasePath}
    />
  );
}
