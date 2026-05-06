import { notFound } from "next/navigation";

import { CampaignTextsView } from "@/components/campaign-texts-view";
import { getCampaign, listCampaignTexts } from "@/lib/supabase/queries";

type PageProps = { params: Promise<{ id: string; campaignId: string }> };

export default async function CampaignTextsPage({ params }: PageProps) {
  const { id, campaignId } = await params;
  const campaign = await getCampaign(campaignId);
  if (!campaign || campaign.project_id !== id) notFound();

  const batches = await listCampaignTexts(campaignId);

  return (
    <CampaignTextsView
      projectId={id}
      campaignId={campaignId}
      batches={batches}
    />
  );
}
