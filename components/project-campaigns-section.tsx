"use client";

import { Megaphone, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { Campaign } from "@/lib/types/campaign";

type Props = {
  projectId: string;
  campaigns: Campaign[];
};

export function ProjectCampaignsSection({ campaigns }: Props) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-5 text-[#7c3aed]" aria-hidden />
          Кампании
        </CardTitle>
        <CardDescription>
          Здесь появятся ваши рекламные кампании внутри проекта. Сначала
          проанализируйте ЦА, затем создайте первую кампанию.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            {campaigns.length === 0
              ? "Кампаний пока нет."
              : `Кампаний: ${campaigns.length}.`}{" "}
            Создание и работа с кампаниями появятся в следующем обновлении.
          </p>

          <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger
              render={
                <Button
                  type="button"
                  disabled
                  className="bg-[#7c3aed] text-white hover:bg-[#6d28d9] gap-2 disabled:opacity-50"
                >
                  <Plus className="size-4" aria-hidden />
                  Новая кампания
                </Button>
              }
            />
            <TooltipPrimitive.Portal>
              <TooltipPrimitive.Positioner sideOffset={8}>
                <TooltipPrimitive.Popup className="rounded-lg bg-popover px-3 py-1.5 text-xs text-popover-foreground ring-1 ring-foreground/10 shadow-md">
                  Создание кампаний — в разработке (этап 4)
                </TooltipPrimitive.Popup>
              </TooltipPrimitive.Positioner>
            </TooltipPrimitive.Portal>
          </TooltipPrimitive.Root>
        </div>
      </CardContent>
    </Card>
  );
}
