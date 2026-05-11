import { redirect } from "next/navigation";

export default async function WorkspaceProjectRootPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  redirect(`/w/${slug}/projects/${id}/upload`);
}
