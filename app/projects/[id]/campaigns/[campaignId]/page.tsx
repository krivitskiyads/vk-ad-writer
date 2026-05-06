import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string; campaignId: string }> };

export default async function CampaignRootPage({ params }: PageProps) {
  const { id, campaignId } = await params;
  redirect(`/projects/${id}/campaigns/${campaignId}/upload`);
}
