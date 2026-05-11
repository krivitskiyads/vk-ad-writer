"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { FileUp, Settings2, Sparkles, Telescope } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { Project } from "@/lib/types/project";
import { cn } from "@/lib/utils";

type Props = {
  project: Project;
  filesCount: number;
  projectBasePath: string;
};

type Tab = {
  key: "upload" | "analysis" | "configure" | "texts";
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  disabled: boolean;
  tooltip?: string;
};

export function ProjectTabs({ project, filesCount, projectBasePath }: Props) {
  const pathname = usePathname();
  const base = projectBasePath;

  const tabs: Tab[] = [
    {
      key: "upload",
      label: "Загрузка",
      href: `${base}/upload`,
      icon: FileUp,
      disabled: false,
    },
    {
      key: "analysis",
      label: "Анализ",
      href: `${base}/analysis`,
      icon: Telescope,
      disabled: filesCount === 0,
      tooltip: "Сначала загрузите материалы",
    },
    {
      key: "configure",
      label: "Настройка",
      href: `${base}/configure`,
      icon: Settings2,
      disabled: project.analysis_status !== "ready",
      tooltip: "Сначала проведите анализ ЦА",
    },
    {
      key: "texts",
      label: "Тексты",
      href: `${base}/texts`,
      icon: Sparkles,
      disabled: project.analysis_status !== "ready",
      tooltip: "Сначала проведите анализ ЦА",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active =
          pathname === t.href ||
          (pathname === base && t.key === "upload");
        const classes = cn(
          buttonVariants({
            variant: active ? "default" : "outline",
            size: "default",
          }),
          "gap-2",
          active ? "pointer-events-none" : "cursor-pointer"
        );
        const Icon = t.icon;

        if (!t.disabled) {
          return (
            <Link key={t.key} href={t.href} className={classes}>
              <Icon className="size-4" aria-hidden />
              {t.label}
            </Link>
          );
        }

        return (
          <TooltipPrimitive.Root key={t.key}>
            <TooltipPrimitive.Trigger
              render={
                <span
                  className={cn(classes, "opacity-50 pointer-events-none")}
                  aria-disabled="true"
                >
                  <Icon className="size-4" aria-hidden />
                  {t.label}
                </span>
              }
            />
            <TooltipPrimitive.Portal>
              <TooltipPrimitive.Positioner sideOffset={8}>
                <TooltipPrimitive.Popup className="max-w-xs rounded-lg bg-popover px-3 py-1.5 text-xs text-popover-foreground ring-1 ring-foreground/10 shadow-md">
                  {t.tooltip ?? "Недоступно"}
                </TooltipPrimitive.Popup>
              </TooltipPrimitive.Positioner>
            </TooltipPrimitive.Portal>
          </TooltipPrimitive.Root>
        );
      })}
    </div>
  );
}

