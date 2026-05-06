"use client";

import { useEffect, useState } from "react";

import { ProjectContextBlock } from "@/components/project-context-block";
import { ProjectMaterialsSection } from "@/components/project-materials-section";
import { ProjectSuccessfulTextsSection } from "@/components/project-successful-texts-section";
import { UploadTabFooter } from "@/components/upload-tab-footer";
import type { Project } from "@/lib/types/project";
import type { ProjectFile } from "@/lib/types/project-files";

type Props = {
  projectId: string;
  project: Project;
  materials: ProjectFile[];
  successfulTexts: ProjectFile[];
};

export function ProjectUploadTab({
  projectId,
  project,
  materials,
  successfulTexts,
}: Props) {
  const [description, setDescription] = useState(() => project.description ?? "");

  useEffect(() => {
    setDescription(project.description ?? "");
  }, [projectId]);

  return (
    <div className="space-y-6">
      <ProjectMaterialsSection projectId={projectId} initialFiles={materials} />

      <ProjectSuccessfulTextsSection
        projectId={projectId}
        initialTexts={successfulTexts}
      />

      <ProjectContextBlock
        projectId={projectId}
        value={description}
        onChange={setDescription}
      />

      <div className="pt-2">
        <UploadTabFooter
          projectId={projectId}
          analysisStatus={project.analysis_status}
          materialsCount={materials.length}
          description={description}
        />
      </div>
    </div>
  );
}

