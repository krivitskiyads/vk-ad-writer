"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderKanban, Settings2, Users } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function settingsHref(workspaceSlug: string | null): string {
  return workspaceSlug ? `/w/${workspaceSlug}/settings` : "/settings";
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const workspaceSlug = pathname.startsWith("/w/")
    ? pathname.split("/")[2]
    : null;
  const projectsHref = workspaceSlug
    ? `/w/${workspaceSlug}/projects`
    : "/projects";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-[#e9e5f5] bg-[#f5f3ff]">
      <div className="flex h-14 items-center px-5">
        <Link
          href={projectsHref}
          className="text-[15px] font-semibold leading-tight text-[#4c1d95]"
        >
          <span>Генератор</span>{" "}
          <span>Кривицкого</span>
        </Link>
      </div>
      <Separator className="bg-[#e9e5f5]" />
      <WorkspaceSwitcher />
      <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
        {(() => {
          const projectsActive =
            pathname.startsWith("/projects") ||
            (workspaceSlug
              ? pathname.startsWith(`/w/${workspaceSlug}/projects`)
              : false);
          const Icon = FolderKanban;
          return (
            <Link
              href={projectsHref}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] font-medium transition-colors",
                projectsActive
                  ? "border-l-[3px] border-[#7c3aed] bg-[rgba(124,58,237,0.08)] text-[#6d28d9]"
                  : "text-[#9ca3af] hover:bg-[#f9fafb] hover:text-[#374151]"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              Проекты
            </Link>
          );
        })()}
        {(() => {
          if (!workspaceSlug) return null;
          const teamHref = `/w/${workspaceSlug}/team`;
          const teamActive = pathname.startsWith(`/w/${workspaceSlug}/team`);
          const Icon = Users;
          return (
            <Link
              href={teamHref}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] font-medium transition-colors",
                teamActive
                  ? "border-l-[3px] border-[#7c3aed] bg-[rgba(124,58,237,0.08)] text-[#6d28d9]"
                  : "text-[#9ca3af] hover:bg-[#f9fafb] hover:text-[#374151]"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              Команда
            </Link>
          );
        })()}
        {(() => {
          const href = settingsHref(workspaceSlug);
          const Icon = Settings2;
          const label = "Настройки";
          const active = workspaceSlug
            ? pathname.startsWith(`/w/${workspaceSlug}/settings`)
            : pathname.startsWith("/settings");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] font-medium transition-colors",
                active
                  ? "border-l-[3px] border-[#7c3aed] bg-[rgba(124,58,237,0.08)] text-[#6d28d9]"
                  : "text-[#9ca3af] hover:bg-[#f9fafb] hover:text-[#374151]"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })()}
      </nav>
      <Separator className="bg-[#e9e5f5]" />
      <div className="p-2.5">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
