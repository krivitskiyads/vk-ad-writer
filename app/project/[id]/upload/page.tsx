import { ProjectUploadForm } from "@/components/project-upload-form";

export default async function ProjectUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectUploadForm projectId={id} />;
}
