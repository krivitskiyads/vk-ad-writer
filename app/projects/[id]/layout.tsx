import { notFound, redirect } from "next/navigation";

import { ProjectLayoutShell } from "@/components/project-layout-shell";
import {
  getCurrentUserRole,
  getProject,
  getProjectsWithUsage,
  listProjectFiles,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [role, files] = await Promise.all([
    getCurrentUserRole(),
    listProjectFiles(id, "material"),
  ]);
  const isAdmin = role === "admin";

  let adminUsage: { total_cost_rub: number; request_count: number } | null = null;
  if (isAdmin) {
    try {
      const summary = await getProjectsWithUsage(user.id);
      const found = summary.find((p) => p.project_id === id);
      if (found) {
        adminUsage = {
          total_cost_rub: found.total_cost_rub,
          request_count: found.request_count,
        };
      }
    } catch (e) {
      console.error("[project-layout] usage summary load failed (non-fatal)", e);
    }
  }

  return (
    <ProjectLayoutShell
      project={project}
      filesCount={files.length}
      isAdmin={isAdmin}
      adminUsage={adminUsage}
    >
      {children}
    </ProjectLayoutShell>
  );
}

