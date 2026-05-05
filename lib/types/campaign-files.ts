export type CampaignFile = {
  id: string;
  campaign_id: string;
  name: string;
  content: string | null;
  file_type: string | null;
  size_bytes: number | null;
  created_at: string;
};
