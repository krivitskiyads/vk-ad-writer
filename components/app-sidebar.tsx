"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderKanban, Settings2 } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/settings", label: "Настройки", icon: Settings2 },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
          href="/projects"
          className="text-[15px] font-semibold leading-tight text-[#4c1d95]"
        >
          <span>Генератор</span>{" "}
          <span>Кривицкого</span>
        </Link>
      </div>
      <Separator className="bg-[#e9e5f5]" />
      <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/projects"
              ? pathname.startsWith("/projects") ||
                pathname.startsWith("/project/")
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
        })}
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
