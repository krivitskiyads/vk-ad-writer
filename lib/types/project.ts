import type { ProjectAnalysis } from "./project-analysis";
import type { SelectedTechniques } from "./knowledge-base";

export type ProjectAnalysisStatus = "pending" | "analyzing" | "ready" | "failed";

export type Project = {
  id: string;
  user_id: string;
  /** Рабочее пространство; после R13a у существующих проектов заполнено. */
  workspace_id: string | null;
  name: string;
  description: string | null;
  analysis: ProjectAnalysis | null;
  selected_techniques: SelectedTechniques | null;
  selected_segment_ids: string[];
  analysis_status: ProjectAnalysisStatus;
  analysisStartedAt?: string | null;
  created_at: string;
  updated_at: string;
};
