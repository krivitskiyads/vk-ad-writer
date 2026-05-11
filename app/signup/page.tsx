import { redirect } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/projects");
  }

  return <SignupForm />;
}
