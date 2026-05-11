import { redirect } from "next/navigation";

import { getProject } from "@/lib/supabase/queries";
import { getWorkspaceSlugById } from "@/lib/supabase/workspaces";

/** Редирект со старых URL `/projects/:id/...` на workspace-маршрут. */
export async function redirectLegacyProjectSubpath(
  projectId: string,
  subpath: "upload" | "analysis" | "configure" | "texts"
) {
  const project = await getProject(projectId);
  if (!project?.workspace_id) redirect("/projects");
  const slug = await getWorkspaceSlugById(project.workspace_id);
  if (!slug) redirect("/projects");
  redirect(`/w/${slug}/projects/${projectId}/${subpath}`);
}
