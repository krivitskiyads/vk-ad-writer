"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  pickAnalysisFromApiResponse,
  toProjectAnalysis,
  type AnalysisSegment,
  type ProjectAnalysis,
} from "@/lib/types/project-analysis";
import { cn } from "@/lib/utils";

const STORAGE_KEY_DESCRIPTION = "project_description";
const STORAGE_KEY_PROJECT_FILES_CONTENT = "project_files_content";
const STORAGE_KEY_SELECTED_SEGMENTS = "selected_segments";
const STORAGE_KEY_ANALYSIS = "project_analysis";

const ANALYZE_FETCH_TIMEOUT_MS = 180_000;

function analyzeFetchAbortSignal(): AbortSignal | undefined {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ANALYZE_FETCH_TIMEOUT_MS);
  }
  return undefined;
}

type ProjectAnalysisViewProps = {
  projectId: string;
};

type ViewStage = "select" | "details";

function priorityLabel(p: string | undefined): string {
  switch (p) {
    case "high":
      return "Высокий";
    case "medium":
      return "Средний";
    case "low":
      return "Низкий";
    default:
      return p ?? "—";
  }
}

function priorityBadgeVariant(
  p: string | undefined
): "default" | "secondary" | "outline" {
  switch (p) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "secondary";
  }
}

function BusinessCard({ analysis }: { analysis: ProjectAnalysis }) {
  const b = analysis.business;
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>О бизнесе</CardTitle>
        <CardDescription>Ниша, география и ключевые тезисы</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Ниша</span>
            <p className="font-medium">{b.niche ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Категория</span>
            <p className="font-medium">{b.niche_category ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Гео</span>
            <p className="font-medium">{b.geo ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Тип бизнеса</span>
            <p className="font-medium">{b.business_type ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Средний чек</span>
            <p className="font-medium">{b.average_check ?? "—"}</p>
          </div>
        </div>
        {b.usp && b.usp.length > 0 && (
          <>
            <Separator />
            <div>
              <span className="text-muted-foreground">УТП</span>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {b.usp.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          </>
        )}
        {b.description_summary && (
          <>
            <Separator />
            <p>{b.description_summary}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SegmentDetailFields({ seg }: { seg: AnalysisSegment }) {
  return (
    <div className="space-y-4 text-sm">
      {seg.demographics && (
        <div>
          <span className="text-muted-foreground font-medium">Демография</span>
          <p className="mt-1">
            {[
              seg.demographics.age_from != null &&
              seg.demographics.age_to != null
                ? `${seg.demographics.age_from}–${seg.demographics.age_to} лет`
                : null,
              seg.demographics.gender
                ? `пол: ${seg.demographics.gender}`
                : null,
              seg.demographics.income
                ? `доход: ${seg.demographics.income}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
      )}

      {seg.pain_points && seg.pain_points.length > 0 && (
        <div>
          <span className="text-muted-foreground font-medium">Боли</span>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {seg.pain_points.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {seg.desires && seg.desires.length > 0 && (
        <div>
          <span className="text-muted-foreground font-medium">Желания</span>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {seg.desires.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {seg.objections && seg.objections.length > 0 && (
        <div>
          <span className="text-muted-foreground font-medium">Возражения</span>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {seg.objections.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {seg.triggers && seg.triggers.length > 0 && (
        <div>
          <span className="text-muted-foreground font-medium">Триггеры</span>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {seg.triggers.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ProjectAnalysisView({ projectId }: ProjectAnalysisViewProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    tokensUsed: number;
    timeMs: number;
  } | null>(null);

  const [viewStage, setViewStage] = useState<ViewStage>("select");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set()
  );
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({});

  const runAnalysis = useCallback(async () => {
    let desc = "";
    let projectFilesContent: { fileName: string; content: string }[] = [];
    try {
      desc = localStorage.getItem(STORAGE_KEY_DESCRIPTION) ?? "";
      const raw = localStorage.getItem(STORAGE_KEY_PROJECT_FILES_CONTENT);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          projectFilesContent = parsed.flatMap((x) => {
            if (typeof x !== "object" || x === null) return [];
            const fileName =
              "fileName" in x && typeof x.fileName === "string"
                ? x.fileName
                : null;
            const content =
              "content" in x && typeof x.content === "string"
                ? x.content
                : null;
            if (fileName === null || content === null) return [];
            return [{ fileName, content }];
          });
        }
      }
    } catch {
      toast.error("Не удалось прочитать localStorage");
    }
    setDescription(desc);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          project_files_content: projectFilesContent,
        }),
        signal: analyzeFetchAbortSignal(),
      });

      const rawText = await res.text();
      console.log("[analyze] HTTP response (full, before JSON.parse)", {
        url: res.url,
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        contentType: res.headers.get("content-type"),
        bodyLength: rawText.length,
        body: rawText,
      });

      let data: unknown;
      try {
        data = rawText.length ? JSON.parse(rawText) : null;
      } catch (parseErr) {
        console.error("[analyze] JSON.parse failed", parseErr);
        throw new Error("Ответ сервера не является корректным JSON");
      }

      console.log("[analyze] data (parsed)", data);

      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Ошибка анализа";
        throw new Error(msg);
      }

      const picked = pickAnalysisFromApiResponse(data);
      console.log("[analyze] picked analysis candidate", picked);

      const normalized = picked !== undefined ? toProjectAnalysis(picked) : null;

      if (normalized) {
        setAnalysis(normalized);
        try {
          localStorage.setItem(
            STORAGE_KEY_ANALYSIS,
            JSON.stringify(normalized)
          );
        } catch {
          // ignore
        }
      } else {
        const pickedShape =
          picked !== null &&
          typeof picked === "object" &&
          !Array.isArray(picked)
            ? Object.keys(picked as object)
            : null;
        console.error("[analyze] toProjectAnalysis failed", {
          pickedType: picked === null ? "null" : typeof picked,
          pickedKeys: pickedShape,
          rawDataKeys:
            typeof data === "object" && data !== null && !Array.isArray(data)
              ? Object.keys(data as object)
              : null,
        });
        throw new Error("Некорректный ответ сервера");
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "tokensUsed" in data &&
        "timeMs" in data
      ) {
        const d = data as { tokensUsed: unknown; timeMs: unknown };
        setMeta({
          tokensUsed: typeof d.tokensUsed === "number" ? d.tokensUsed : 0,
          timeMs: typeof d.timeMs === "number" ? d.timeMs : 0,
        });
      } else {
        setMeta(null);
      }

      setViewStage("select");
      setSelectedIndices(new Set());
      setExpandedMap({});
      try {
        localStorage.removeItem(STORAGE_KEY_SELECTED_SEGMENTS);
      } catch {
        /* ignore */
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? `Превышено время ожидания ответа (${ANALYZE_FETCH_TIMEOUT_MS / 1000} с)`
          : e instanceof Error
            ? e.message
            : "Неизвестная ошибка";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  async function handleRestart() {
    await runAnalysis();
  }

  function toggleSegmentSelected(index: number, checked: boolean) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  }

  function handleWorkWithSelected() {
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    if (sorted.length === 0) return;
    try {
      localStorage.setItem(
        STORAGE_KEY_SELECTED_SEGMENTS,
        JSON.stringify(sorted)
      );
    } catch {
      toast.error("Не удалось сохранить выбранные сегменты");
      return;
    }
    setViewStage("details");
  }

  function toggleExpanded(segmentIndex: number) {
    setExpandedMap((prev) => ({
      ...prev,
      [segmentIndex]: !prev[segmentIndex],
    }));
  }

  const selectedSorted =
    analysis != null
      ? Array.from(selectedIndices)
          .sort((a, b) => a - b)
          .filter((i) => i >= 0 && i < analysis.segments.length)
      : [];

  if (loading && !analysis) {
    return (
      <div className="border-border bg-muted/30 flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[12px] border border-dashed px-6 py-16">
        <Loader2
          className="text-primary size-10 animate-spin"
          aria-hidden
        />
        <p className="text-foreground text-center text-base font-medium">
          Анализируем ваш проект...
        </p>
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          Обычно это занимает от 15 до 60 секунд
        </p>
      </div>
    );
  }

  if (!loading && error && !analysis) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="notion-page-title">Анализ</h1>
          <p className="notion-page-subtitle">Не удалось получить анализ</p>
        </div>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Ошибка</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button type="button" onClick={handleRestart}>
              Попробовать снова
            </Button>
            <Link
              href={`/project/${projectId}/upload`}
              className={buttonVariants({ variant: "outline" })}
            >
              Вернуться к загрузке
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const pos = analysis.positioning;

  return (
    <div className="space-y-8">
      {error && analysis && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="notion-page-title">Результат анализа</h1>
          <p className="notion-page-subtitle">
            Сегменты, позиционирование и риски для рекламы во ВКонтакте
          </p>
          {meta && (
            <p className="text-muted-foreground mt-2 text-xs">
              Токенов: {meta.tokensUsed} · {meta.timeMs} мс
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleRestart}
          disabled={loading}
          className="gap-2 shrink-0"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Перезапустить анализ
        </Button>
      </div>

      {loading && (
        <div className="bg-primary/5 text-primary flex items-center gap-2 rounded-lg border border-primary/20 px-3 py-2 text-sm">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Обновляем анализ...
        </div>
      )}

      {viewStage === "select" && (
        <>
          <BusinessCard analysis={analysis} />

          <div className="space-y-4">
            <h2 className="text-[1.15rem] font-bold tracking-[-0.02em] text-foreground">
              Выберите сегменты для работы
            </h2>
            <div className="grid gap-3">
              {analysis.segments.map((seg, index) => (
                <Card
                  key={`${seg.name}-${index}`}
                  className="border-border py-3"
                >
                  <CardContent className="flex gap-3 px-4 py-0">
                    <Checkbox
                      id={`segment-${index}`}
                      checked={selectedIndices.has(index)}
                      onCheckedChange={(v) =>
                        toggleSegmentSelected(index, v === true)
                      }
                      className="mt-1"
                      aria-label={`Выбрать сегмент «${seg.name}»`}
                    />
                    <label
                      htmlFor={`segment-${index}`}
                      className="min-w-0 flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-medium leading-snug">
                          {seg.name}
                        </span>
                        <Badge
                          variant={priorityBadgeVariant(seg.priority)}
                          className="shrink-0"
                        >
                          {priorityLabel(seg.priority)}
                        </Badge>
                      </div>
                      {seg.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {seg.description}
                        </p>
                      )}
                    </label>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                onClick={handleWorkWithSelected}
                disabled={selectedIndices.size === 0}
              >
                Работать с выбранными сегментами
              </Button>
            </div>
          </div>
        </>
      )}

      {viewStage === "details" && (
        <>
          <div className="space-y-4">
            <h2 className="text-[1.15rem] font-bold tracking-[-0.02em] text-foreground">
              Детали выбранных сегментов
            </h2>
            <div className="grid gap-4">
              {selectedSorted.map((segmentIndex) => {
                const seg = analysis.segments[segmentIndex];
                if (!seg) return null;
                const open = expandedMap[segmentIndex] === true;
                return (
                  <Card
                    key={`detail-${segmentIndex}`}
                    className="border-border overflow-hidden"
                  >
                    <CardHeader className="gap-3 space-y-0 pb-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <CardTitle className="text-base">{seg.name}</CardTitle>
                          {seg.description && (
                            <CardDescription className="text-sm leading-relaxed">
                              {seg.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant={priorityBadgeVariant(seg.priority)}>
                            {priorityLabel(seg.priority)}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpanded(segmentIndex)}
                          >
                            {open ? "Свернуть" : "Раскрыть"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {open && (
                      <CardContent className="border-border border-t pt-4">
                        <SegmentDetailFields seg={seg} />
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Позиционирование</CardTitle>
              <CardDescription>Ключевое сообщение и выгоды</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {pos.main_message && (
                <div>
                  <span className="text-muted-foreground">
                    Ключевое сообщение
                  </span>
                  <p className="mt-1 font-medium">{pos.main_message}</p>
                </div>
              )}
              {pos.tone_of_voice && (
                <div>
                  <span className="text-muted-foreground">
                    Тон коммуникации
                  </span>
                  <p className="mt-1">{pos.tone_of_voice}</p>
                </div>
              )}
              {pos.key_benefits && pos.key_benefits.length > 0 && (
                <div>
                  <span className="text-muted-foreground">
                    Выгоды для клиента
                  </span>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {pos.key_benefits.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {analysis.warnings.length > 0 && (
            <Card
              className={cn(
                "border-amber-200/90 bg-amber-50 shadow-none",
                "dark:border-amber-900 dark:bg-amber-950/40"
              )}
            >
              <CardHeader>
                <CardTitle className="text-amber-950 dark:text-amber-100">
                  Предупреждения
                </CardTitle>
                <CardDescription className="text-amber-900/80 dark:text-amber-200/80">
                  Модерация ВК и особенности ниши
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-amber-950 dark:text-amber-100 list-inside list-disc space-y-2 text-sm">
                  {analysis.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewStage("select")}
            >
              ← Назад к выбору сегментов
            </Button>
            <Button
              type="button"
              onClick={() =>
                router.push(`/project/${projectId}/configure`)
              }
            >
              Далее — настройка генерации
            </Button>
          </div>
        </>
      )}

      {viewStage === "select" && !description.trim() && (
        <p className="text-muted-foreground text-xs">
          Описание проекта в браузере не найдено — анализ выполнен по пустому
          вводу. Уточните бриф на шаге загрузки и перезапустите анализ.
        </p>
      )}
    </div>
  );
}
