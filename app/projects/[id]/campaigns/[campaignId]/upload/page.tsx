import { notFound } from "next/navigation";

import { CampaignUploadSection } from "@/components/campaign-upload-section";
import { getCampaign, listCampaignFiles } from "@/lib/supabase/queries";

type PageProps = { params: Promise<{ id: string; campaignId: string }> };

export default async function CampaignUploadPage({ params }: PageProps) {
  const { id, campaignId } = await params;
  const campaign = await getCampaign(campaignId);
  if (!campaign || campaign.project_id !== id) notFound();

  const files = await listCampaignFiles(campaignId);

  return (
    <CampaignUploadSection
      projectId={id}
      campaignId={campaignId}
      initialFiles={files}
    />
  );
}
