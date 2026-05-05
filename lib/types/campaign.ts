import type { ProjectAnalysis } from "./project-analysis";
import type { SelectedTechniques } from "./knowledge-base";

export type CampaignStatus = "draft" | "active" | "archived";

export type Campaign = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  analysis_snapshot: ProjectAnalysis | null;
  techniques_snapshot: SelectedTechniques | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
};
