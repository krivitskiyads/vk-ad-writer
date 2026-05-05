import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderPlus, Plus } from "lucide-react";

import { ProjectCard } from "@/components/project-card";
import { buttonVariants } from "@/components/ui/button";
import {
  getCurrentUserRole,
  listProjects,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function ProjectsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projects, role] = await Promise.all([
    listProjects(user.id),
    getCurrentUserRole(),
  ]);
  const isAdmin = role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="notion-page-title">Проекты</h1>
          <p className="notion-page-subtitle">
            Каждый проект — отдельный клиент с его материалами и анализом ЦА
          </p>
        </div>
        <Link
          href="/projects/new"
          className={cn(
            buttonVariants(),
            "bg-[#7c3aed] text-white hover:bg-[#6d28d9] gap-2"
          )}
        >
          <Plus className="size-4" aria-hidden />
          Новый проект
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#f5f3ff] text-[#7c3aed]">
            <FolderPlus className="size-7" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold">У вас пока нет проектов</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Создайте первый проект, чтобы начать работу с клиентом — загрузите его
            материалы, проанализируйте ЦА и запускайте кампании.
          </p>
          <Link
            href="/projects/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 bg-[#7c3aed] text-white hover:bg-[#6d28d9] gap-2"
            )}
          >
            <Plus className="size-4" aria-hidden />
            Создать первый проект
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.project_id} project={p} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
