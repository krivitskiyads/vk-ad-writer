"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  RefreshCcw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import type {
  AnalysisSegment,
  ProjectAnalysis,
} from "@/lib/types/project-analysis";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
  filesCount: number;
};

const PROGRESS_MESSAGES = [
  "Изучаем материалы…",
  "Формируем сегменты аудитории…",
  "Подбираем техники копирайтинга…",
  "Финализируем анализ…",
];

const ESTIMATE_LABEL = "≈ 10–15 ₽";

function AnalyzingState() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % PROGRESS_MESSAGES.length);
    }, 8000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#7c3aed]/30 bg-[#f5f3ff] px-4 py-3">
      <div className="size-2.5 animate-pulse rounded-full bg-[#7c3aed]" aria-hidden />
      <span className="text-sm font-medium text-[#5b21b6]">
        {PROGRESS_MESSAGES[index]}
      </span>
    </div>
  );
}

function SegmentCard({ segment }: { segment: AnalysisSegment }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-[#7c3aed]/10 text-[#7c3aed]">
          <Users className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug">{segment.name}</h3>
          {segment.description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {segment.description}
            </p>
          )}
        </div>
      </div>
      {segment.pain_points && segment.pain_points.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Боли
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed">
            {segment.pain_points.slice(0, 4).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {segment.desires && segment.desires.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Желания
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed">
            {segment.desires.slice(0, 4).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReadyState({
  analysis,
  onReanalyze,
}: {
  analysis: ProjectAnalysis;
  onReanalyze: () => void;
}) {
  const segments = analysis.segments ?? [];
  const positioning = analysis.positioning ?? {};
  const business = analysis.business ?? {};

  return (
    <div className="space-y-4">
      {(business.niche || positioning.main_message) && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Target className="size-3.5" aria-hidden />
            Главное про бизнес
          </div>
          {business.niche && (
            <p className="text-sm">
              <span className="text-muted-foreground">Ниша: </span>
              {business.niche}
            </p>
          )}
          {positioning.main_message && (
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">Главное сообщение: </span>
              {positioning.main_message}
            </p>
          )}
        </div>
      )}

      {segments.length > 0 ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">
              Сегменты ЦА ({segments.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              редактирование сегментов — в разработке
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {segments.map((s, i) => (
              <SegmentCard key={i} segment={s} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          AI не выделил конкретных сегментов. Попробуйте добавить материалы и
          перепроанализировать.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={onReanalyze}
      >
        <RefreshCcw className="size-3.5" aria-hidden />
        Перепроанализировать
      </Button>
    </div>
  );
}

export function ProjectAnalysisSection({ project, filesCount }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(project.analysis_status === "analyzing");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Если статус "analyzing" — поллим getProject через router.refresh каждые 8с
  useEffect(() => {
    if (project.analysis_status !== "analyzing") {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      setRunning(false);
      return;
    }
    setRunning(true);
    pollTimer.current = setInterval(() => {
      router.refresh();
    }, 8000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [project.analysis_status, router]);

  const startAnalyze = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось запустить анализ");
      }
      toast.success("Анализ готов");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка анализа";
      toast.error(message);
      router.refresh();
    } finally {
      setRunning(false);
    }
  };

  const reanalyze = () => {
    setConfirmOpen(false);
    void startAnalyze();
  };

  const status = project.analysis_status;
  const showAnalyzing = running || status === "analyzing";

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#7c3aed]" aria-hidden />
          Анализ целевой аудитории
        </CardTitle>
        <CardDescription>
          Основа всей дальнейшей работы с проектом. Из материалов клиента AI
          выделит сегменты аудитории, опишет их боли и желания, подберёт техники
          копирайтинга.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAnalyzing ? (
          <AnalyzingState />
        ) : status === "ready" && project.analysis ? (
          <ReadyState
            analysis={project.analysis}
            onReanalyze={() => setConfirmOpen(true)}
          />
        ) : status === "failed" ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Анализ не удалось завершить</p>
                <p className="mt-0.5 text-xs">
                  Это могло произойти из-за временной ошибки сети или AI. Попробуйте
                  ещё раз.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void startAnalyze()}
              disabled={filesCount === 0}
              className="bg-[#7c3aed] text-white hover:bg-[#6d28d9] gap-2"
            >
              <RefreshCcw className="size-4" aria-hidden />
              Попробовать снова
            </Button>
            <p className="text-xs text-muted-foreground">{ESTIMATE_LABEL}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              type="button"
              onClick={() => void startAnalyze()}
              disabled={filesCount === 0 || running}
              className="bg-[#7c3aed] text-white hover:bg-[#6d28d9] gap-2"
            >
              <Sparkles className="size-4" aria-hidden />
              Запустить анализ
            </Button>
            {filesCount === 0 ? (
              <p className="text-xs text-muted-foreground">
                Сначала загрузите материалы клиента
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{ESTIMATE_LABEL}</p>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перепроанализировать проект?</DialogTitle>
            <DialogDescription>
              Текущий анализ ЦА и подбор техник будут заменены новыми. Кампании,
              созданные ранее, сохранят свои снимки и не пострадают.
              <br />
              <br />
              {ESTIMATE_LABEL}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={reanalyze}
              className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
            >
              Запустить заново
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
