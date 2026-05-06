import { notFound } from "next/navigation";

import { ProjectAnalysisTab } from "@/components/project-analysis-tab";
import { getProject } from "@/lib/supabase/queries";

export default async function ProjectAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return <ProjectAnalysisTab projectId={id} project={project} />;
}

