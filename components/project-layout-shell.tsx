"use client";

import type { ReactNode } from "react";

import { ProjectHeader } from "@/components/project-header";
import { ProjectTabs } from "@/components/project-tabs";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
  filesCount: number;
  isAdmin: boolean;
  adminUsage: { total_cost_rub: number; request_count: number } | null;
  children: ReactNode;
};

export function ProjectLayoutShell({
  project,
  filesCount,
  isAdmin,
  adminUsage,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      <ProjectHeader
        projectId={project.id}
        initialName={project.name}
        description={project.description}
        admin={isAdmin ? adminUsage : null}
      />

      <ProjectTabs project={project} filesCount={filesCount} />

      <div>{children}</div>
    </div>
  );
}

