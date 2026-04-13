import { ProjectConfigureView } from "@/components/project-configure-view";

export default async function ProjectConfigurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectConfigureView projectId={id} />;
}
