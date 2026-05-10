import { notFound } from "next/navigation";

import { ProjectConfigureTab } from "@/components/project-configure-tab";
import { getProject, getProjectSettings } from "@/lib/supabase/queries";

function mapStoredTextFormat(
  tf: string | undefined
): "micro" | "short" | "long" | "mixed" {
  if (tf === "micro") return "micro";
  if (tf === "short") return "short";
  if (tf === "long") return "long";
  if (tf === "mixed") return "mixed";
  return "mixed";
}

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
              length: mapStoredTextFormat(settings.textFormat),
              trafficDestination: settings.trafficDestination,
              customWishes: settings.customWishes ?? "",
            }
          : null
      }
    />
  );
}
