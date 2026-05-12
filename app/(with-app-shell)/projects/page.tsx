import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";
import { getFirstOwnedWorkspaceSlug } from "@/lib/supabase/workspaces";

export default async function ProjectsRedirect() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const slug = await getFirstOwnedWorkspaceSlug(user.id);
  if (slug) {
    redirect(`/w/${slug}/projects`);
  }
  redirect("/login");
}
