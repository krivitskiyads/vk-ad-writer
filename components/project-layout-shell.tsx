"use client";

import type { ReactNode } from "react";

import { ProjectGenerationProvider } from "@/components/project-generation-context";
import { ProjectHeader } from "@/components/project-header";
import { ProjectTabs } from "@/components/project-tabs";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
  filesCount: number;
  isAdmin: boolean;
  adminUsage: { total_cost_rub: number; request_count: number } | null;
  children: ReactNode;
  workspaceProjectsHref: string;
  projectBasePath: string;
};

export function ProjectLayoutShell({
  project,
  filesCount,
  isAdmin,
  adminUsage,
  children,
  workspaceProjectsHref,
  projectBasePath,
}: Props) {
  return (
    <ProjectGenerationProvider>
      <div className="space-y-6">
        <ProjectHeader
          projectId={project.id}
          initialName={project.name}
          description={project.description}
          admin={isAdmin ? adminUsage : null}
          workspaceProjectsHref={workspaceProjectsHref}
        />

        <ProjectTabs
          project={project}
          filesCount={filesCount}
          projectBasePath={projectBasePath}
        />

        <div>{children}</div>
      </div>
    </ProjectGenerationProvider>
  );
}

