"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { BusinessSummaryCard } from "@/components/business-summary-card";
import { SegmentCard } from "@/components/segment-card";
import { SegmentDetailsDialog } from "@/components/segment-details-dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project } from "@/lib/types/project";
import type { ProjectAnalysis } from "@/lib/types/project-analysis";
import { toProjectAnalysis, withStableSegmentIds } from "@/lib/types/project-analysis";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  project: Project;
};

const POLL_MS = 8000;
const ANALYZING_MESSAGES = [
  "Изучаем материалы…",
  "Формируем сегменты…",
  "Подбираем техники…",
  "Финализируем…",
] as const;

function safeAnalysis(raw: unknown): ProjectAnalysis | null {
  if (!raw) return null;
  const parsed = toProjectAnalysis(raw);
  if (!parsed) return null;
  return withStableSegmentIds(parsed);
}

export function ProjectAnalysisTab({ projectId, project }: Props) {
  const router = useRouter();

  const analysis = useMemo(() => safeAnalysis(project.analysis), [project.analysis]);
  const [analysisState, setAnalysisState] = useState<ProjectAnalysis | null>(analysis);
  useEffect(() => setAnalysisState(analysis), [analysis]);

  const segments = analysisState?.segments ?? [];
  const allSegmentIds = useMemo(
    () =>
      segments
        .map((s) => s.id)
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0),
    [segments]
  );

  const defaultSelected = useMemo(() => {
    const saved = Array.isArray(project.selected_segment_ids)
      ? project.selected_segment_ids.filter((id) => allSegmentIds.includes(id))
      : [];
    return saved;
  }, [project.selected_segment_ids, allSegmentIds]);

  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelected);
  const [savedIds, setSavedIds] = useState<string[]>(defaultSelected);
  const [saveStatus, setSaveStatus] = useState<"ok" | "dirty" | "saving" | "error">(
    "ok"
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openSegmentId, setOpenSegmentId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(defaultSelected);
    setSavedIds(defaultSelected);
    setSaveStatus("ok");
    setSaveError(null);
  }, [defaultSelected]);

  const isDirty = useMemo(
    () => JSON.stringify(savedIds) !== JSON.stringify(selectedIds),
    [savedIds, selectedIds]
  );

  useEffect(() => {
    if (saveStatus === "saving") return;
    if (saveStatus === "error") return;
    setSaveStatus(isDirty ? "dirty" : "ok");
  }, [isDirty, saveStatus]);

  const persist = async (next: string[]): Promise<boolean> => {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_segment_ids: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      setSavedIds(next);
      setSaveStatus("ok");
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка сохранения";
      setSaveError(msg);
      setSaveStatus("error");
      return false;
    }
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  };

  const status = project.analysis_status;

  // Polling + rotating message during analyzing
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    if (status !== "analyzing") return;
    const t1 = setInterval(() => {
      router.refresh();
    }, POLL_MS);
    const t2 = setInterval(() => {
      setMsgIndex((i) => (i + 1) % ANALYZING_MESSAGES.length);
    }, POLL_MS);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [status, router]);

  const [recheckOpen, setRecheckOpen] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const restartAnalyze = async () => {
    setRechecking(true);
    // новый анализ сбрасывает selected_segment_ids в [], синхронизируем UI сразу
    setSelectedIds([]);
    setSavedIds([]);
    setSaveStatus("ok");
    setSaveError(null);
    fetch(`/api/projects/${projectId}/analyze`, { method: "POST" }).catch((err) =>
      console.error("[project-analysis-tab] analyze failed", err)
    );
    router.refresh();
    setTimeout(() => setRechecking(false), 400);
  };

  const isSaving = saveStatus === "saving";

  const handleSaveDraft = () => {
    void persist(selectedIds);
  };

  const handleNext = async () => {
    if (saveStatus === "saving") return;
    if (isDirty) {
      const ok = await persist(selectedIds);
      if (!ok) return;
    }
    router.push(`/projects/${projectId}/configure`);
  };

  const footer = (
    <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleSaveDraft}
        disabled={!isDirty || isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Сохраняем...
          </>
        ) : (
          "Сохранить черновик"
        )}
      </Button>

      <span className="text-sm text-gray-500">
        {isSaving
          ? "Сохраняем..."
          : isDirty
            ? "Есть несохранённые изменения"
            : "✓ Сохранено"}
      </span>

      <Button type="button" onClick={() => void handleNext()} disabled={isSaving}>
        Дальше → Настройка
      </Button>
    </div>
  );

  if (status === "pending") {
    return (
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Анализ ещё не запущен</CardTitle>
            <CardDescription>
              Загрузите материалы клиента и запустите анализ ЦА.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/projects/${projectId}/upload`}
              className={buttonVariants({ variant: "outline", size: "default" })}
            >
              ← К загрузке
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "analyzing") {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-7 animate-spin" aria-hidden />
          <p className="text-sm">{ANALYZING_MESSAGES[msgIndex]}</p>
          <p className="text-xs text-muted-foreground/80">
            Страница обновляется автоматически
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    const hasAnalysis = Boolean(analysis);
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <div className="font-medium">
                Не удалось проанализировать материалы
              </div>
              <div className="mt-0.5 text-amber-900/80">
                Можно попробовать снова или вернуться к загрузке и проверить, что
                материалы корректны.
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void restartAnalyze()}
            disabled={rechecking}
            className="gap-2"
          >
            {rechecking && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Попробовать снова
          </Button>
          <Link
            href={`/projects/${projectId}/upload`}
            className={buttonVariants({ variant: "secondary", size: "default" })}
          >
            ← К загрузке
          </Link>
        </div>

        {hasAnalysis ? footer : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BusinessSummaryCard — можно закомментировать одной строкой при откате */}
      {analysisState ? (
        <BusinessSummaryCard business={analysisState.business} positioning={analysisState.positioning} />
      ) : null}

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>
              Выберите сегменты для работы{" "}
              <span className="text-muted-foreground font-normal">
                ({segments.length})
              </span>
            </CardTitle>
            <CardDescription>
              Выберите, под какие сегменты пишем тексты.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 pt-1">
            <div className="text-xs text-muted-foreground">
              {saveStatus === "saving" ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> сохраняем…
                </span>
              ) : saveStatus === "ok" ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3" aria-hidden /> сохранено
                </span>
              ) : saveStatus === "dirty" ? (
                <span className="text-muted-foreground">Есть несохранённые изменения</span>
              ) : (
                <span className="text-red-600">
                  {saveError ?? "Не удалось сохранить, попробуйте ещё"}
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => setRecheckOpen(true)}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Перепроанализировать
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {segments.map((s) => {
              const id = s.id!;
              const checked = selectedIds.includes(id);
              return (
                <SegmentCard
                  key={id}
                  segment={s}
                  selected={checked}
                  onToggle={() => toggle(id)}
                  onOpenDetails={() => setOpenSegmentId(id)}
                />
              );
            })}
          </div>

          {footer}
        </CardContent>
      </Card>

      {analysisState && openSegmentId ? (
        <SegmentDetailsDialog
          projectId={projectId}
          open={Boolean(openSegmentId)}
          onOpenChange={(v) => setOpenSegmentId(v ? openSegmentId : null)}
          analysis={analysisState}
          segmentId={openSegmentId}
          onSaved={(next) => setAnalysisState(next)}
        />
      ) : null}

      <Dialog open={recheckOpen} onOpenChange={setRecheckOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Запустить анализ заново?</DialogTitle>
            <DialogDescription>
              Анализ будет пересобран на основе текущих материалов проекта.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRecheckOpen(false)}
              disabled={rechecking}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => {
                setRecheckOpen(false);
                void restartAnalyze();
              }}
              disabled={rechecking}
              className={cn("gap-2")}
            >
              {rechecking && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Запустить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

