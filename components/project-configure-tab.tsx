"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Minus, Plus, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { TechniquesEditor } from "@/components/techniques-editor";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Project } from "@/lib/types/project";
import type { SelectedTechniques } from "@/lib/types/knowledge-base";
import { cn } from "@/lib/utils";

type ApiSettings = {
  project_id: string;
  model: string;
  count: number;
  length: "short" | "medium" | "long";
};

type ModelId = "fast" | "optimal" | "max";
type LengthId = "short" | "medium" | "long";

const SAVE_DEBOUNCE_MS = 600;

const MODEL_BY_ID: Record<ModelId, string> = {
  fast: "claude-haiku-4-5-20251001",
  optimal: "claude-sonnet-4-6",
  max: "claude-opus-4-6",
};

function modelIdFromString(model: string | null | undefined): ModelId {
  const m = (model ?? "").toLowerCase();
  if (m.includes("haiku")) return "fast";
  if (m.includes("opus")) return "max";
  return "optimal";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buttonClass(active: boolean): string {
  return cn(
    buttonVariants({
      variant: active ? "default" : "outline",
      size: "sm",
    }),
    "px-3"
  );
}

type Props = {
  projectId: string;
  project: Project;
  initialSettings: ApiSettings | null;
};

export function ProjectConfigureTab({ projectId, project, initialSettings }: Props) {
  const router = useRouter();

  const defaults: ApiSettings = useMemo(
    () => ({
      project_id: projectId,
      model: "claude-sonnet-4-6",
      count: 5,
      length: "medium",
    }),
    [projectId]
  );

  const init = initialSettings ?? defaults;
  const [modelId, setModelId] = useState<ModelId>(() => modelIdFromString(init.model));
  const [count, setCount] = useState(() => clamp(init.count ?? 5, 1, 10));
  const [length, setLength] = useState<LengthId>(() => init.length ?? "medium");

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void persist();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, count, length]);

  const persist = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_BY_ID[modelId],
          count,
          length,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить настройки");
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const [techniques, setTechniques] = useState<SelectedTechniques | null>(
    project.selected_techniques ?? null
  );
  const [techSaving, setTechSaving] = useState(false);
  const [techSavedAt, setTechSavedAt] = useState<number | null>(null);
  const techTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const techMount = useRef(true);

  useEffect(() => {
    setTechniques(project.selected_techniques ?? null);
  }, [project.id, project.selected_techniques]);

  useEffect(() => {
    if (techMount.current) {
      techMount.current = false;
      return;
    }
    if (techTimer.current) clearTimeout(techTimer.current);
    techTimer.current = setTimeout(() => {
      void persistTechniques(techniques);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (techTimer.current) clearTimeout(techTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techniques]);

  const persistTechniques = async (next: SelectedTechniques | null) => {
    setTechSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_techniques: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить техники");
      }
      setTechSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setTechSaving(false);
    }
  };

  const resetToAi = () => {
    const ai = project.analysis?.selected_techniques ?? null;
    if (!ai) return;
    setTechniques(ai);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Параметры генерации</CardTitle>
            <CardDescription>
              Модель, количество и длина будущих текстов.
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            {saving ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" aria-hidden /> сохраняем…
              </span>
            ) : savedAt && Date.now() - savedAt < 2000 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="size-3" aria-hidden /> сохранено
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-medium">Модель</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass(modelId === "fast")}
                onClick={() => setModelId("fast")}
              >
                Быстрая
              </button>
              <button
                type="button"
                className={buttonClass(modelId === "optimal")}
                onClick={() => setModelId("optimal")}
              >
                Оптимальная
              </button>
              <button
                type="button"
                className={buttonClass(modelId === "max")}
                onClick={() => setModelId("max")}
              >
                Максимум
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Быстрая — экономично. Оптимальная (рекомендуем) — баланс. Максимум —
              самые проработанные тексты, медленнее.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Количество текстов</div>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setCount((c) => clamp(c - 1, 1, 10))}
                aria-label="Уменьшить"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{count}</span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setCount((c) => clamp(c + 1, 1, 10))}
                aria-label="Увеличить"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Длина</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass(length === "short")}
                onClick={() => setLength("short")}
              >
                Короткий
              </button>
              <button
                type="button"
                className={buttonClass(length === "medium")}
                onClick={() => setLength("medium")}
              >
                Средний
              </button>
              <button
                type="button"
                className={buttonClass(length === "long")}
                onClick={() => setLength("long")}
              >
                Длинный
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Стратегия копирайтинга</CardTitle>
            <CardDescription>
              Формула, триггеры и структуры для генерации.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 pt-1">
            <div className="text-xs text-muted-foreground">
              {techSaving ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> сохраняем…
                </span>
              ) : techSavedAt && Date.now() - techSavedAt < 2000 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3" aria-hidden /> сохранено
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={resetToAi}
              disabled={!project.analysis?.selected_techniques}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Сбросить выбор AI
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TechniquesEditor
            initialSelected={project.analysis?.selected_techniques ?? null}
            value={
              techniques ?? {
                triggers: [],
                formulas: [],
                structures: [],
                reasoning: "",
              }
            }
            onChange={(next) => setTechniques(next)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        <Link
          href={`/projects/${projectId}/analysis`}
          className={buttonVariants({ variant: "outline", size: "default" })}
        >
          ← Анализ
        </Link>
        <Link
          href={`/projects/${projectId}/texts`}
          className={cn(buttonVariants({ variant: "default", size: "default" }), "gap-2")}
        >
          <Sparkles className="size-4" aria-hidden />
          Дальше → К генерации
        </Link>
      </div>
    </div>
  );
}

