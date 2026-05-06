"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { Campaign } from "@/lib/types/campaign";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  campaigns: Campaign[];
  analysisReady: boolean;
  batchCounts: Record<string, number>;
};

export function ProjectCampaignsSection({
  projectId,
  campaigns,
  analysisReady,
  batchCounts,
}: Props) {
  const newHref = `/projects/${projectId}/campaigns/new`;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-[#7c3aed]" aria-hidden />
            Кампании
          </CardTitle>
          <CardDescription>
            Отдельные задачи внутри проекта: распродажа, новый поток, акция. У
            каждой — свои материалы, настройки и сгенерированные тексты.
          </CardDescription>
        </div>
        {campaigns.length > 0 && (
          <div className="shrink-0">
            {!analysisReady ? (
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger
                  render={
                    <span className="inline-block">
                      <Button
                        type="button"
                        disabled
                        variant="default"
                        className="gap-2 disabled:opacity-50"
                      >
                        Сгенерировать тексты
                      </Button>
                    </span>
                  }
                />
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Positioner sideOffset={8}>
                    <TooltipPrimitive.Popup className="max-w-xs rounded-lg bg-popover px-3 py-1.5 text-xs text-popover-foreground ring-1 ring-foreground/10 shadow-md">
                      Сначала проанализируйте ЦА на уровне проекта
                    </TooltipPrimitive.Popup>
                  </TooltipPrimitive.Positioner>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            ) : (
              <Link
                href={newHref}
                className={cn(
                  buttonVariants({ variant: "default", size: "default" }),
                  "gap-2"
                )}
              >
                Сгенерировать тексты
              </Link>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-6">
            <p className="text-sm text-muted-foreground max-w-xl">
              Кампаний пока нет. Создайте первую, чтобы сгенерировать тексты для
              конкретной задачи (распродажа, новый поток, чёрная пятница).
            </p>
            {!analysisReady ? (
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger
                  render={
                    <span className="inline-block">
                      <Button
                        type="button"
                        size="lg"
                        disabled
                        variant="default"
                        className="disabled:opacity-50"
                      >
                        Сгенерировать тексты
                      </Button>
                    </span>
                  }
                />
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Positioner sideOffset={8}>
                    <TooltipPrimitive.Popup className="max-w-xs rounded-lg bg-popover px-3 py-1.5 text-xs text-popover-foreground ring-1 ring-foreground/10 shadow-md">
                      Сначала проанализируйте ЦА на уровне проекта
                    </TooltipPrimitive.Popup>
                  </TooltipPrimitive.Positioner>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            ) : (
              <Link
                href={newHref}
                className={buttonVariants({ variant: "default", size: "lg" })}
              >
                Сгенерировать тексты
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {campaigns.map((c) => (
              <li key={c.id}>
                <CampaignCard
                  projectId={projectId}
                  campaign={c}
                  batchCount={batchCounts[c.id] ?? 0}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
