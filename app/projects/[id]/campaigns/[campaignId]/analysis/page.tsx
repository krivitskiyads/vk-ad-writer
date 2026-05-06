import { notFound } from "next/navigation";

import { CampaignAnalysisView } from "@/components/campaign-analysis-view";
import { getCampaign } from "@/lib/supabase/queries";

type PageProps = { params: Promise<{ id: string; campaignId: string }> };

export default async function CampaignAnalysisPage({ params }: PageProps) {
  const { id, campaignId } = await params;
  const campaign = await getCampaign(campaignId);
  if (!campaign || campaign.project_id !== id) notFound();

  return <CampaignAnalysisView projectId={id} campaign={campaign} />;
}
