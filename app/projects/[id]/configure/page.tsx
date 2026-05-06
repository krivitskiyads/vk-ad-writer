import { notFound } from "next/navigation";

import { ProjectConfigureTab } from "@/components/project-configure-tab";
import { getProject, getProjectSettings } from "@/lib/supabase/queries";

export default async function ProjectConfigurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, settings] = await Promise.all([
    getProject(id),
    getProjectSettings(id),
  ]);
  if (!project) notFound();

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
              length:
                settings.textFormat === "short"
                  ? "short"
                  : settings.textFormat === "long"
                    ? "long"
                    : settings.textFormat === "mixed"
                      ? "mixed"
                    : "medium",
            }
          : null
      }
    />
  );
}

