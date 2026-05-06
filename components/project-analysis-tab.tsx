"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { SegmentPill } from "@/components/segment-pill";
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

const SAVE_DEBOUNCE_MS = 600;
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
  const segments = analysis?.segments ?? [];
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
    return saved.length > 0 ? saved : allSegmentIds;
  }, [project.selected_segment_ids, allSegmentIds]);

  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelected);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    setSelectedIds(defaultSelected);
  }, [defaultSelected]);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void persist(selectedIds);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  const persist = async (next: string[]) => {
    setSaving(true);
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
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
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
    fetch(`/api/projects/${projectId}/analyze`, { method: "POST" }).catch((err) =>
      console.error("[project-analysis-tab] analyze failed", err)
    );
    router.refresh();
    setTimeout(() => setRechecking(false), 400);
  };

  const footer = status === "ready" ? (
    <div className="flex flex-wrap justify-between gap-3">
      <Link
        href={`/projects/${projectId}/upload`}
        className={buttonVariants({ variant: "outline", size: "default" })}
      >
        ← Загрузка
      </Link>
      <Link
        href={`/projects/${projectId}/configure`}
        className={cn(buttonVariants({ variant: "default", size: "default" }), "gap-2")}
      >
        Дальше → Настройка
      </Link>
    </div>
  ) : null;

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

  // ready
  const business = analysis?.business ?? {};
  const positioning = analysis?.positioning ?? {};

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Главное про бизнес</CardTitle>
          <CardDescription>Короткая выжимка из анализа</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ниша
              </div>
              <div className="mt-1">
                {(business.niche ?? "").trim() || "—"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Главное сообщение
              </div>
              <div className="mt-1">
                {(positioning.main_message ?? "").trim() || "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>
              Сегменты ЦА{" "}
              <span className="text-muted-foreground font-normal">
                ({segments.length})
              </span>
            </CardTitle>
            <CardDescription>
              Выберите, под какие сегменты пишем тексты. По умолчанию — все.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 pt-1">
            <div className="text-xs text-muted-foreground">
              {saving ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> сохраняем…
                </span>
              ) : savedAt ? (
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
              onClick={() => setRecheckOpen(true)}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Перепроанализировать
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {segments.map((s) => {
              const id = s.id!;
              const checked = selectedIds.includes(id);
              return (
                <SegmentPill
                  key={id}
                  segment={s}
                  checked={checked}
                  onToggle={() => toggle(id)}
                />
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            {saving ? "Сохраняем выбор сегментов…" : savedAt ? "Выбор сохранён" : ""}
          </div>
        </CardContent>
      </Card>

      {footer}

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

