import { notFound } from "next/navigation";

import { ProjectUploadTab } from "@/components/project-upload-tab";
import { getProject, listProjectFiles } from "@/lib/supabase/queries";

export default async function ProjectUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, materials, successfulTexts] = await Promise.all([
    getProject(id),
    listProjectFiles(id, "material"),
    listProjectFiles(id, "successful_text"),
  ]);

  if (!project) notFound();

  return (
    <ProjectUploadTab
      projectId={id}
      project={project}
      materials={materials}
      successfulTexts={successfulTexts}
    />
  );
}

