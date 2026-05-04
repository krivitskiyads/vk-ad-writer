export interface ProjectUsageSummary {
  project_id: string;
  user_id: string;
  total_cost_usd: number;
  total_cost_rub: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_requests: number;
  analyze_count: number;
  generate_count: number;
  last_request_at: string | null;
}
