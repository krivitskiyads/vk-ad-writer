import { redirectLegacyProjectSubpath } from "@/lib/server/legacy-project-redirect";

export default async function ProjectTextsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyProjectSubpath(id, "texts");
}
