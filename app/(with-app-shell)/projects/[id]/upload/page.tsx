import { redirectLegacyProjectSubpath } from "@/lib/server/legacy-project-redirect";

export default async function ProjectUploadRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyProjectSubpath(id, "upload");
}
