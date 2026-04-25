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
      className="border-border bg-card mb-8 flex flex-wrap items-center gap-1 rounded-[12px] border px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
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
                "focus-visible:ring-ring/50 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[14px] font-medium transition-colors outline-none focus-visible:ring-3",
                isActive && "text-[#6d28d9]",
                isPast && !isActive && "text-[#6d28d9]",
                isFuture && "text-[#9ca3af]",
                "hover:bg-[#f9fafb]"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isActive && "bg-[#7c3aed] text-white",
                  isPast && !isActive && "bg-[#7c3aed] text-white",
                  isFuture && "bg-[#e5e7eb] text-[#9ca3af]"
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
