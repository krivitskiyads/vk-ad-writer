import { notFound } from "next/navigation";

import { CampaignConfigureView } from "@/components/campaign-configure-view";
import { mergeGenerationSettings } from "@/lib/generation-settings-row";
import {
  getCampaign,
  getCampaignSettings,
  getProject,
} from "@/lib/supabase/queries";

type PageProps = { params: Promise<{ id: string; campaignId: string }> };

export default async function CampaignConfigurePage({ params }: PageProps) {
  const { id, campaignId } = await params;
  const [campaign, project, settingsRow] = await Promise.all([
    getCampaign(campaignId),
    getProject(id),
    getCampaignSettings(campaignId),
  ]);
  if (!campaign || campaign.project_id !== id) notFound();
  if (!project) notFound();

  const initialSettings = settingsRow ?? mergeGenerationSettings(null, {});

  return (
    <CampaignConfigureView
      projectId={id}
      campaign={campaign}
      projectTechniques={project.selected_techniques}
      initialSettings={initialSettings}
    />
  );
}
