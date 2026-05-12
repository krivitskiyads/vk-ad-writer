import { redirect } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/projects");
  }

  const sp = await searchParams;
  return (
    <SignupForm initialEmail={sp.email} next={sp.next} />
  );
}
