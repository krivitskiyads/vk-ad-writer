"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Segment = {
  id?: string;
  name: string;
  description?: string;
  pain_points?: string[];
  desires?: string[];
};

type Props = {
  segment: Segment;
  checked: boolean;
  onToggle: () => void;
};

function listOrNull(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const items = v.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  return items.length > 0 ? items : null;
}

export function SegmentPill({ segment, checked, onToggle }: Props) {
  const [open, setOpen] = useState(false);

  const pains = useMemo(() => listOrNull(segment.pain_points), [segment.pain_points]);
  const desires = useMemo(() => listOrNull(segment.desires), [segment.desires]);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "group inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors",
          "ring-1 ring-transparent hover:ring-2 hover:ring-primary/30",
          checked
            ? "bg-[#7c3aed] text-white"
            : "bg-[#7c3aed]/10 text-foreground"
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          className={cn(
            "pointer-events-none",
            checked ? "border-white data-[state=checked]:bg-white" : ""
          )}
          aria-label="Выбрать сегмент"
        />
        <span className="max-w-[260px] truncate">{segment.name}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }
          }}
          aria-label="Подробнее о сегменте"
          className={cn(
            "ml-1 inline-flex size-6 items-center justify-center rounded-full",
            checked ? "hover:bg-white/15" : "hover:bg-[#7c3aed]/10"
          )}
        >
          <Info className={cn("size-4", checked ? "text-white/90" : "text-muted-foreground")} aria-hidden />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{segment.name}</DialogTitle>
            {segment.description ? (
              <DialogDescription>{segment.description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {pains && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Боли
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  {pains.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {desires && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Желания
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  {desires.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {!pains && !desires && (
              <p className="text-sm text-muted-foreground">
                Детали сегмента не заданы.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

