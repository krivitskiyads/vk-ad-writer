import { notFound } from "next/navigation";

import { ProjectTextsTab } from "@/components/project-texts-tab";
import { getProject, getProjectSettings, listProjectTexts } from "@/lib/supabase/queries";

export default async function ProjectTextsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, settings, batches] = await Promise.all([
    getProject(id),
    getProjectSettings(id),
    listProjectTexts(id),
  ]);
  if (!project) notFound();

  return (
    <ProjectTextsTab
      projectId={id}
      project={project}
      settings={settings}
      batches={batches}
    />
  );
}

