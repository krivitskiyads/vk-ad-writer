export type ProjectUsageSummary = {
  project_id: string;
  user_id: string;
  name: string;
  campaign_count: number;
  request_count: number;
  total_cost_usd: number;
  total_cost_rub: number;
  last_activity_at: string | null;
};
