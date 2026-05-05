import { notFound, redirect } from "next/navigation";

import { ProjectAnalysisSection } from "@/components/project-analysis-section";
import { ProjectCampaignsSection } from "@/components/project-campaigns-section";
import { ProjectHeader } from "@/components/project-header";
import { ProjectMaterialsSection } from "@/components/project-materials-section";
import { ProjectStrategySection } from "@/components/project-strategy-section";
import {
  getCurrentUserRole,
  getProject,
  getProjectsWithUsage,
  listCampaigns,
  listProjectFiles,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: PageProps) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [files, campaigns, role] = await Promise.all([
    listProjectFiles(id),
    listCampaigns(id),
    getCurrentUserRole(),
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
      console.error("[project-page] usage summary load failed (non-fatal)", e);
    }
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        projectId={project.id}
        initialName={project.name}
        description={project.description}
        admin={adminUsage}
      />

      <ProjectMaterialsSection projectId={project.id} initialFiles={files} />

      <ProjectAnalysisSection project={project} filesCount={files.length} />

      {project.analysis_status === "ready" && (
        <ProjectStrategySection
          projectId={project.id}
          initialSelected={project.selected_techniques}
        />
      )}

      <ProjectCampaignsSection
        projectId={project.id}
        campaigns={campaigns}
      />
    </div>
  );
}
