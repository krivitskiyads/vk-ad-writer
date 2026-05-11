"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  startedAt: string;
  model?: "sonnet" | "opus";
};

const TICK_MS = 500;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function stageByProgress(progress: number): string {
  if (progress < 15) return "Читаем материалы и доп. информацию…";
  if (progress < 35) return "Изучаем боли и потребности аудитории…";
  if (progress < 60) return "Выделяем сегменты целевой аудитории…";
  if (progress < 85) return "Подбираем техники копирайтинга…";
  return "Финализируем анализ…";
}

function etaForModel(model?: "sonnet" | "opus"): number {
  return model === "opus" ? 105 : 70;
}

export function AnalysisProgress({ startedAt, model }: Props) {
  const eta = useMemo(() => etaForModel(model), [model]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedMs = new Date(startedAt).getTime();
    const compute = () => {
      const now = Date.now();
      const elapsedSec = Number.isFinite(startedMs)
        ? Math.max(0, (now - startedMs) / 1000)
        : 0;
      const next = clamp((elapsedSec / eta) * 95, 0, 95);
      setProgress(next);
    };

    compute();
    const timer = setInterval(compute, TICK_MS);
    return () => clearInterval(timer);
  }, [startedAt, eta]);

  const stage = stageByProgress(progress);
  const etaText = eta >= 90 ? "около двух минут" : "около минуты";

  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center">
      <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-700 motion-safe:animate-pulse">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
      <h3 className="text-foreground text-xl font-semibold">Анализируем аудиторию</h3>
      <p className="text-muted-foreground mt-2 text-sm">{stage}</p>

      <div className="mt-6">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>
        <div className="text-muted-foreground mt-2 text-xs">
          {Math.round(progress)}%
        </div>
      </div>

      <p className="text-muted-foreground mt-4 text-xs">Обычно занимает {etaText}</p>
    </div>
  );
}
