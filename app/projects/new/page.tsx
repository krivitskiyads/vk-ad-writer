import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ProjectCreateForm } from "@/components/project-create-form";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function NewProjectPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />К списку
          </Link>
          <h1 className="notion-page-title mt-2">Новый проект</h1>
          <p className="notion-page-subtitle">
            Создайте проект под клиента, загрузите материалы и запустите анализ ЦА
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <ProjectCreateForm />
      </div>
    </div>
  );
}
