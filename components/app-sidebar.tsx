"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Settings2 } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/settings", label: "Настройки", icon: Settings2 },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center px-6">
        <Link
          href="/projects"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          <span className="text-primary">Генератор</span>{" "}
          <span className="text-foreground">Кривицкого</span>
        </Link>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-3">
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
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
