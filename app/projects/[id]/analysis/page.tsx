import { notFound } from "next/navigation";

import { AnalysisPoller } from "@/components/analysis-poller";
import { ProjectAnalysisTab } from "@/components/project-analysis-tab";
import { getProject } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <>
      {project.analysis_status === "analyzing" && <AnalysisPoller projectId={id} />}
      <ProjectAnalysisTab projectId={id} project={project} />
    </>
  );
}

