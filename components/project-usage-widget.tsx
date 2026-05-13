"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProjectGenerationOptional } from "@/components/project-generation-context";
import { createClient } from "@/lib/supabase/client";

type OpStats = {
  count: number;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_rub: number | string | null;
};

type StatsPayload = {
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cost_rub?: number | string;
  total_operations?: number;
  by_operation?: Record<string, OpStats>;
};

const DISPLAY_ORDER = [
  "Анализ ЦА",
  "Генерация текстов",
  "Распознавание PDF",
] as const;

function operationLabel(op: string): string {
  switch (op) {
    case "analyze_project":
      return "Анализ ЦА";
    case "generate":
    case "regenerate":
      return "Генерация текстов";
    case "ocr_pdf":
      return "Распознавание PDF";
    default:
      return op;
  }
}

/** Объединяем generate + regenerate в одну строку «Генерация текстов». */
function mergeByDisplayName(
  byOp: Record<string, OpStats> | undefined
): { label: string; count: number; costRub: number }[] {
  if (!byOp || Object.keys(byOp).length === 0) return [];

  const merged = new Map<string, { count: number; costRub: number }>();

  for (const [op, st] of Object.entries(byOp)) {
    const label = operationLabel(op);
    const count = Number(st.count) || 0;
    const cost = Number(st.cost_rub) || 0;
    const prev = merged.get(label);
    if (prev) {
      merged.set(label, {
        count: prev.count + count,
        costRub: prev.costRub + cost,
      });
    } else {
      merged.set(label, { count, costRub: cost });
    }
  }

  const keys = Array.from(merged.keys());
  keys.sort((a, b) => {
    const ia = DISPLAY_ORDER.indexOf(a as (typeof DISPLAY_ORDER)[number]);
    const ib = DISPLAY_ORDER.indexOf(b as (typeof DISPLAY_ORDER)[number]);
    const sa = ia >= 0 ? ia : 999;
    const sb = ib >= 0 ? ib : 999;
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b, "ru");
  });

  return keys.map((label) => {
    const m = merged.get(label)!;
    return { label, count: m.count, costRub: m.costRub };
  });
}

type Props = { projectId: string };

export function ProjectUsageWidget({ projectId }: Props) {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generationCtx = useProjectGenerationOptional();
  const usageRefreshTick = generationCtx?.usageRefreshTick ?? 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    void (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_project_usage_stats",
          { p_project_id: projectId }
        );
        if (rpcError) throw new Error(rpcError.message);
        if (!cancelled) setStats((data as StatsPayload) ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, usageRefreshTick]);

  const rows = useMemo(
    () => mergeByDisplayName(stats?.by_operation),
    [stats?.by_operation]
  );

  const totalRub = Number(stats?.total_cost_rub) || 0;
  const inTok = Number(stats?.total_input_tokens) || 0;
  const outTok = Number(stats?.total_output_tokens) || 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Использование</CardTitle>
        <CardDescription>
          Стоимость запросов к AI по этому проекту
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2
              className="size-6 animate-spin text-muted-foreground"
              aria-hidden
            />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <div>
              <div className="text-3xl font-semibold tabular-nums">
                {totalRub.toFixed(2)} ₽
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {inTok} input + {outTok} output токенов
              </p>
            </div>
            {rows.length > 0 && (
              <ul className="space-y-2 border-t border-border pt-3 text-sm">
                {rows.map((r) => (
                  <li
                    key={r.label}
                    className="flex justify-between gap-3 text-muted-foreground"
                  >
                    <span className="text-foreground">{r.label}</span>
                    <span className="shrink-0 tabular-nums">
                      {r.count} запросов · {r.costRub.toFixed(2)} ₽
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
