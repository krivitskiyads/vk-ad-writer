"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Загрузка", segment: "upload" },
  { id: 2, label: "Анализ", segment: "analysis" },
  { id: 3, label: "Настройка", segment: "configure" },
  { id: 4, label: "Тексты", segment: "texts" },
] as const;

function getActiveStepFromPath(pathname: string): number {
  const parts = pathname.split("/").filter(Boolean);
  const seg = parts[parts.length - 1];
  const found = STEPS.find((s) => s.segment === seg);
  return found?.id ?? 1;
}

export function ProjectStepper() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = typeof params?.id === "string" ? params.id : "";
  const active = getActiveStepFromPath(pathname);

  return (
    <nav
      aria-label="Этапы проекта"
      className="border-border/80 bg-card mb-8 flex flex-wrap items-center gap-1 rounded-xl border px-4 py-3 shadow-sm"
    >
      {STEPS.map((step, index) => {
        const href =
          projectId !== ""
            ? `/project/${projectId}/${step.segment}`
            : "#";
        const isActive = step.id === active;
        const isPast = step.id < active;
        const isFuture = step.id > active;

        return (
          <div key={step.id} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                className="text-muted-foreground mx-1 size-4 shrink-0"
                aria-hidden
              />
            )}
            <Link
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive && "bg-primary/10 text-primary",
                isPast &&
                  !isActive &&
                  "text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40",
                isFuture && "text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isActive && "bg-primary text-primary-foreground",
                  isPast &&
                    !isActive &&
                    "bg-emerald-600 text-white dark:bg-emerald-700",
                  isFuture && "bg-muted text-muted-foreground"
                )}
              >
                {isPast && !isActive ? (
                  <Check className="size-4" strokeWidth={2.5} aria-hidden />
                ) : (
                  step.id
                )}
              </span>
              <span>{step.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
