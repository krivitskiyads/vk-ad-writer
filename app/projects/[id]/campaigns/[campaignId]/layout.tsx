import { notFound } from "next/navigation";

import { CampaignWizardLayout } from "@/components/campaign-wizard-layout";
import { getCampaign, getProject } from "@/lib/supabase/queries";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string; campaignId: string }>;
};

export default async function CampaignLayout({
  children,
  params,
}: LayoutProps) {
  const { id, campaignId } = await params;
  const [campaign, project] = await Promise.all([
    getCampaign(campaignId),
    getProject(id),
  ]);
  if (!campaign || campaign.project_id !== id) notFound();
  if (!project) notFound();

  return (
    <CampaignWizardLayout
      projectId={id}
      projectName={project.name}
      campaignId={campaignId}
      initialCampaignName={campaign.name}
    >
      {children}
    </CampaignWizardLayout>
  );
}
