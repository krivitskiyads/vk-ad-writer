import type { ProjectAnalysis } from "./project-analysis";
import type { SelectedTechniques } from "./knowledge-base";

export type ProjectAnalysisStatus = "pending" | "analyzing" | "ready" | "failed";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  analysis: ProjectAnalysis | null;
  selected_techniques: SelectedTechniques | null;
  analysis_status: ProjectAnalysisStatus;
  created_at: string;
  updated_at: string;
};
