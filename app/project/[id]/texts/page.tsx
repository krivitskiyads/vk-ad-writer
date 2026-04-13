import { ProjectTextsView } from "@/components/project-texts-view";

export default async function ProjectTextsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectTextsView projectId={id} />;
}
