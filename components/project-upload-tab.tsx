"use client";

import { useState } from "react";

import { ProjectContextBlock } from "@/components/project-context-block";
import { ProjectMaterialsSection } from "@/components/project-materials-section";
import { ProjectSuccessfulTextsSection } from "@/components/project-successful-texts-section";
import { UploadTabFooter } from "@/components/upload-tab-footer";
import type { AnalysisModelId } from "@/lib/analysis-model-options";
import type { Project } from "@/lib/types/project";
import type { ProjectFile } from "@/lib/types/project-files";

type Props = {
  projectId: string;
  project: Project;
  materials: ProjectFile[];
  successfulTexts: ProjectFile[];
  /** Slug workspace для библиотеки материалов (вкладка загрузки). */
  workspaceSlug: string;
  /** По умолчанию легаси-путь `/projects/:id`. */
  projectBasePath?: string;
};

type ContentProps = Omit<Props, "projectBasePath"> & {
  projectBasePath: string;
};

export function ProjectUploadTab({
  projectId,
  project,
  materials,
  successfulTexts,
  workspaceSlug,
  projectBasePath: projectBasePathProp,
}: Props) {
  const projectBasePath = projectBasePathProp ?? `/projects/${projectId}`;
  return (
    <ProjectUploadTabContent
      key={projectId}
      projectId={projectId}
      project={project}
      materials={materials}
      successfulTexts={successfulTexts}
      workspaceSlug={workspaceSlug}
      projectBasePath={projectBasePath}
    />
  );
}

function ProjectUploadTabContent({
  projectId,
  project,
  materials,
  successfulTexts,
  workspaceSlug,
  projectBasePath,
}: ContentProps) {
  const [description, setDescription] = useState(project.description ?? "");
  const [selectedAnalysisModel, setSelectedAnalysisModel] =
    useState<AnalysisModelId>("sonnet");

  return (
    <div className="space-y-6">
      <ProjectContextBlock
        projectId={projectId}
        value={description}
        onChange={setDescription}
      />

      <ProjectMaterialsSection
        projectId={projectId}
        workspaceSlug={workspaceSlug}
        initialFiles={materials}
      />

      <ProjectSuccessfulTextsSection
        projectId={projectId}
        initialTexts={successfulTexts}
      />

      <div className="pt-2">
        <UploadTabFooter
          projectId={projectId}
          projectBasePath={projectBasePath}
          analysisStatus={project.analysis_status}
          materialsCount={materials.length}
          description={description}
          selectedAnalysisModel={selectedAnalysisModel}
          onSelectedAnalysisModelChange={setSelectedAnalysisModel}
        />
      </div>
    </div>
  );
}

