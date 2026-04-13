import { ProjectAnalysisView } from "@/components/project-analysis-view";

export default async function ProjectAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectAnalysisView projectId={id} />;
}
