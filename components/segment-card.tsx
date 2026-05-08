"use client";

import type { AnalysisSegment } from "@/lib/types/project-analysis";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityPill } from "@/components/priority-pill";

type Props = {
  segment: AnalysisSegment;
  selected: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
};

function asPriority(v: unknown): "high" | "medium" | "low" {
  return v === "high" || v === "medium" || v === "low" ? v : "medium";
}

export function SegmentCard({ segment, selected, onToggle, onOpenDetails }: Props) {
  return (
    <div
      className="rounded-lg border bg-white p-5 cursor-pointer transition
             border-gray-200 hover:border-gray-300
             [data-selected=true]:border-violet-500 
             [data-selected=true]:bg-violet-50/30"
      data-selected={selected}
      onClick={onOpenDetails}
    >
      <div className="flex items-start gap-4">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-gray-900">{segment.name}</h3>
            <PriorityPill priority={asPriority(segment.priority)} />
          </div>
          <p className="mt-2 text-sm text-gray-600 line-clamp-3">{segment.description}</p>
        </div>
      </div>
    </div>
  );
}

