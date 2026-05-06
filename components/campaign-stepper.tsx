"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type Step = { href: string; label: string; short: string };

function buildSteps(projectId: string, campaignId: string): Step[] {
  const base = `/projects/${projectId}/campaigns/${campaignId}`;
  return [
    { href: `${base}/upload`, label: "Загрузка", short: "1" },
    { href: `${base}/analysis`, label: "Анализ", short: "2" },
    { href: `${base}/configure`, label: "Настройка", short: "3" },
    { href: `${base}/texts`, label: "Тексты", short: "4" },
  ];
}

type Props = {
  projectId: string;
  campaignId: string;
};

export function CampaignStepper({ projectId, campaignId }: Props) {
  const pathname = usePathname();
  const stepList = buildSteps(projectId, campaignId);
  const campaignRoot = `/projects/${projectId}/campaigns/${campaignId}`;

  return (
    <ol className="flex flex-wrap gap-2 sm:gap-3">
      {stepList.map((step, i) => {
        const active =
          pathname === step.href || (i === 0 && pathname === campaignRoot);
        return (
          <li key={step.href}>
            <Link
              href={step.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-[#7c3aed] bg-[#7c3aed]/10 text-foreground font-medium"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
            >
              <span className="tabular-nums text-xs opacity-70">
                [{step.short}]
              </span>
              {step.label}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
