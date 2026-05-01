"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  STORAGE_KEY_GENERATION_SETTINGS,
  trafficDestinationLabel,
  type ClaudeModel,
  type GenerationSettings,
  type TextFormat,
  type TrafficDestination,
} from "@/lib/generation-settings";
import {
  getGeneratedTexts,
  getGenerationSettings,
  getProject,
  saveGeneratedTexts,
} from "@/lib/supabase/queries";
import {
  toProjectAnalysis,
  type ProjectAnalysis,
} from "@/lib/types/project-analysis";
import type { GeneratedAdText } from "@/lib/types/generated-texts";
import { createClientId } from "@/lib/utils";

const STORAGE_KEY_ANALYSIS = "project_analysis";
const STORAGE_KEY_SELECTED_SEGMENTS = "selected_segments";
const STORAGE_KEY_REFERENCE_TEXTS = "project_reference_texts";

type ProjectTextsViewProps = {
  projectId: string;
};

type StoredText = GeneratedAdText & { id: string };

type LoadedContext = {
  analysis: ProjectAnalysis;
  selectedIndices: number[];
  projectName?: string | null;
  settings: {
    trafficDestination: TrafficDestination;
    textFormat: TextFormat;
    textCount: number;
    customWishes: string;
    referenceTexts: string;
    model: ClaudeModel;
  };
};

function stripId(t: StoredText): GeneratedAdText {
  const { id: _id, ...rest } = t;
  return rest;
}

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatLabel(tf: string) {
  return tf === "long" ? "Длинный" : "Короткий";
}

function buildCopyPayload(t: GeneratedAdText, index?: number) {
  const num = index !== undefined ? index + 1 : 1;
  const separator = "═".repeat(55);
  const fullText = [t.headline, "", t.body].join("\n");
  return `${separator}\nТЕКСТ ${num} — «${t.approach}»\n${separator}\n\n${fullText}\n`;
}

/** Собирает контекст для генерации: сначала Supabase, fallback на localStorage. */
async function loadContext(projectId: string): Promise<LoadedContext> {
  let analysis: ProjectAnalysis | null = null;
  let selectedIndices: number[] = [];
  let projectName: string | null = null;

  try {
    const project = await getProject(projectId);
    const n = (project as { name?: unknown } | null)?.name;
    if (typeof n === "string" && n.trim()) projectName = n.trim();
    const rawAnalysis = (project as { analysis?: unknown } | null)?.analysis;
    analysis = toProjectAnalysis(rawAnalysis);

    const rawSelected = (project as { selected_segments?: unknown } | null)
      ?.selected_segments;
    if (Array.isArray(rawSelected)) {
      selectedIndices = rawSelected.filter(
        (i): i is number => typeof i === "number"
      );
    }
  } catch (e) {
    console.error("[texts] getProject failed", e);
  }

  if (!analysis) {
    const aRaw =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY_ANALYSIS)
        : null;
    const parsed = toProjectAnalysis(readJson<unknown>(aRaw));
    if (parsed) analysis = parsed;
  }
  if (selectedIndices.length === 0) {
    const selRaw =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY_SELECTED_SEGMENTS)
        : null;
    const sel = readJson<number[]>(selRaw);
    if (Array.isArray(sel)) {
      selectedIndices = sel.filter((x) => typeof x === "number");
    }
  }

  if (!analysis) {
    throw new Error("Нет анализа проекта. Пройдите шаг анализа.");
  }
  if (!selectedIndices.length) {
    throw new Error("Не выбраны сегменты. Вернитесь к анализу.");
  }

  let trafficDestination: TrafficDestination | null = null;
  let textFormat: TextFormat | null = null;
  let textCount: number | null = null;
  let customWishes = "";
  let referenceTexts = "";
  let model: ClaudeModel = "claude-sonnet-4-6";

  try {
    const s = await getGenerationSettings(projectId);
    if (s) {
      const o = s as {
        traffic_destination?: unknown;
        text_format?: unknown;
        text_count?: unknown;
        custom_wishes?: unknown;
        reference_texts?: unknown;
        model?: unknown;
      };
      if (typeof o.traffic_destination === "string") {
        trafficDestination = o.traffic_destination as TrafficDestination;
      }
      if (
        o.text_format === "short" ||
        o.text_format === "long" ||
        o.text_format === "mixed"
      ) {
        textFormat = o.text_format;
      }
      if (typeof o.text_count === "number") textCount = o.text_count;
      if (typeof o.custom_wishes === "string") customWishes = o.custom_wishes;
      if (typeof o.reference_texts === "string") {
        referenceTexts = o.reference_texts;
      }
      if (typeof o.model === "string") model = o.model as ClaudeModel;
    }
  } catch (e) {
    console.error("[texts] getGenerationSettings failed", e);
  }

  if (!trafficDestination || !textFormat || typeof textCount !== "number") {
    // Fallback на localStorage
    const gsRaw =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY_GENERATION_SETTINGS)
        : null;
    const gs = readJson<Partial<GenerationSettings>>(gsRaw);
    if (gs) {
      if (!trafficDestination && gs.trafficDestination) {
        trafficDestination = gs.trafficDestination;
      }
      if (!textFormat && gs.textFormat) textFormat = gs.textFormat;
      if (textCount == null && typeof gs.textCount === "number") {
        textCount = gs.textCount;
      }
      if (!customWishes && typeof gs.customWishes === "string") {
        customWishes = gs.customWishes;
      }
      if (gs.model) model = gs.model;
    }
  }

  if (!referenceTexts && typeof window !== "undefined") {
    try {
      referenceTexts =
        localStorage.getItem(STORAGE_KEY_REFERENCE_TEXTS) ?? referenceTexts;
    } catch {
      // ignore
    }
  }

  if (!trafficDestination || !textFormat || typeof textCount !== "number") {
    throw new Error("Нет настроек генерации. Заполните шаг «Настройка».");
  }

  return {
    analysis,
    selectedIndices,
    projectName,
    settings: {
      trafficDestination,
      textFormat,
      textCount,
      customWishes,
      referenceTexts,
      model,
    },
  };
}

export function ProjectTextsView({ projectId }: ProjectTextsViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texts, setTexts] = useState<StoredText[]>([]);
  const [hasExisting, setHasExisting] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");
  const [projectName, setProjectName] = useState<string | null>(null);
  const contextRef = useRef<LoadedContext | null>(null);

  const runGeneration = useCallback(
    async (opts: {
      mode: "initial" | "append" | "feedback";
      feedbackText?: string;
      currentCount?: number;
      existingForFeedback?: GeneratedAdText[];
    }) => {
      setGenerating(true);
      setError(null);
      try {
        const ctx = contextRef.current ?? (await loadContext(projectId));
        contextRef.current = ctx;
        setProjectName(ctx.projectName ?? null);

        const { analysis, selectedIndices, settings } = ctx;

        const selectedSegments = selectedIndices
          .filter((i) => i >= 0 && i < analysis.segments.length)
          .map((i) => analysis.segments[i]);

        const { mode } = opts;
        const append = mode === "append";
        const feedbackMode = mode === "feedback";
        const feedbackText = feedbackMode
          ? opts.feedbackText?.trim()
          : undefined;

        const countForRequest =
          mode === "append"
            ? settings.textCount
            : feedbackMode
              ? Math.min(
                  10,
                  Math.max(1, opts.currentCount ?? settings.textCount)
                )
              : settings.textCount;

        const existingForFeedback =
          feedbackMode && (opts.existingForFeedback?.length ?? 0) > 0
            ? opts.existingForFeedback
            : undefined;

        const res = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysis,
            selectedSegments,
            trafficDestination: trafficDestinationLabel(
              settings.trafficDestination
            ),
            textFormat: settings.textFormat,
            textCount: countForRequest,
            customWishes: settings.customWishes,
            model: settings.model,
            referenceTexts: settings.referenceTexts,
            feedback: feedbackText,
            existingTexts: existingForFeedback,
          }),
        });

        const data: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
              ? (data as { error: string }).error
              : "Ошибка генерации";
          throw new Error(msg);
        }

        const nextTextsUnknown = (data as { texts?: unknown }).texts;
        if (!Array.isArray(nextTextsUnknown)) {
          throw new Error("Некорректный ответ сервера");
        }
        const tokensUsed =
          typeof (data as { tokensUsed?: unknown }).tokensUsed === "number"
            ? ((data as { tokensUsed: number }).tokensUsed)
            : 0;
        const timeMs =
          typeof (data as { timeMs?: unknown }).timeMs === "number"
            ? ((data as { timeMs: number }).timeMs)
            : 0;

        const mapped: StoredText[] = nextTextsUnknown.map((t) => ({
          id: createClientId(),
          ...(t as GeneratedAdText),
        }));

        let finalTexts: StoredText[] = [];
        setTexts((prev) => {
          finalTexts = append ? [...prev, ...mapped] : mapped;
          return finalTexts;
        });
        setSelected({});
        setHasExisting(true);

        // Сохраняем батч в Supabase
        try {
          const payload = finalTexts.map(stripId) as unknown[];
          await saveGeneratedTexts(
            projectId,
            payload,
            tokensUsed,
            timeMs,
            settings.model,
            feedbackText
          );
        } catch (e) {
          console.error("[texts] saveGeneratedTexts failed", e);
          toast.error("Не удалось сохранить тексты в облако");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
        setError(msg);
        toast.error(msg);
      } finally {
        setGenerating(false);
      }
    },
    [projectId]
  );

  // ── Инициализация: если есть сохранённые тексты — показываем их, иначе генерим ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const ctx = await loadContext(projectId);
        if (cancelled) return;
        contextRef.current = ctx;
        setProjectName(ctx.projectName ?? null);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      let existingFound = false;
      try {
        const existing = await getGeneratedTexts(projectId);
        if (cancelled) return;
        if (existing) {
          const existingTexts = (existing as { texts?: unknown }).texts;
          if (Array.isArray(existingTexts)) {
            const mapped: StoredText[] = existingTexts.map((t) => ({
              id: createClientId(),
              ...(t as GeneratedAdText),
            }));
            setTexts(mapped);
            setHasExisting(true);
            existingFound = true;
          }
        }
      } catch (e) {
        console.error("[texts] getGeneratedTexts failed", e);
      }

      if (!cancelled) setLoading(false);

      if (!cancelled && !existingFound) {
        await runGeneration({ mode: "initial" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, runGeneration]);

  const selectedCount = useMemo(() => {
    return texts.filter((t) => selected[t.id]).length;
  }, [texts, selected]);

  async function copyText(t: StoredText) {
    try {
      await navigator.clipboard.writeText(buildCopyPayload(t));
      toast.success("Скопировано");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  async function copySelected() {
    const chosen = texts.filter((t) => selected[t.id]);
    if (chosen.length === 0) {
      toast.message("Ничего не выбрано");
      return;
    }
    const payload = chosen.map((t, i) => buildCopyPayload(t, i)).join("\n\n");
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Скопировано");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  function downloadSelected() {
    const chosen = texts.filter((t) => selected[t.id]);
    if (chosen.length === 0) {
      toast.message("Ничего не выбрано");
      return;
    }
    const payload = chosen.map((t, i) => buildCopyPayload(t, i)).join("\n\n");
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-");
    a.download = projectName
      ? `${projectName}_тексты_${date}.txt`
      : `тексты_${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const busy = loading || generating;

  if (loading && texts.length === 0) {
    return (
      <div className="border-border bg-muted/30 flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[12px] border border-dashed px-6 py-16">
        <Loader2 className="text-primary size-10 animate-spin" aria-hidden />
        <p className="text-foreground text-center text-base font-medium">
          Загружаем тексты…
        </p>
      </div>
    );
  }

  if (generating && texts.length === 0) {
    return (
      <div className="border-border bg-muted/30 flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[12px] border border-dashed px-6 py-16">
        <Loader2 className="text-primary size-10 animate-spin" aria-hidden />
        <p className="text-foreground text-center text-base font-medium">
          Генерируем тексты...
        </p>
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          Обычно это занимает от 20 до 90 секунд
        </p>
      </div>
    );
  }

  if (error && texts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="notion-page-title">Тексты</h1>
          <p className="notion-page-subtitle">
            Не удалось сгенерировать тексты
          </p>
        </div>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Ошибка</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              type="button"
              onClick={() => void runGeneration({ mode: "initial" })}
            >
              Попробовать снова
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="notion-page-title">Тексты</h1>
          <p className="notion-page-subtitle">
            Выберите варианты и скопируйте в работу
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-muted-foreground text-sm">
            Выбрано:{" "}
            <span className="text-foreground font-medium">
              {selectedCount} из {texts.length}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedCount === texts.length) {
                setSelected({});
              } else {
                const all: Record<string, boolean> = {};
                texts.forEach((t) => {
                  all[t.id] = true;
                });
                setSelected(all);
              }
            }}
          >
            {selectedCount === texts.length ? "Снять всё" : "Выбрать все"}
          </Button>
          <Button type="button" variant="outline" onClick={copySelected}>
            Копировать выбранные
          </Button>
          <Button type="button" variant="outline" onClick={downloadSelected}>
            <Download className="mr-2 size-4" aria-hidden />
            Скачать выбранные
          </Button>
        </div>
      </div>

      {hasExisting && !generating && (
        <div className="bg-muted/40 text-muted-foreground flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span>
            Показаны ранее сгенерированные тексты. Можно перегенерировать или
            добавить ещё.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void runGeneration({ mode: "initial" })}
          >
            Перегенерировать
          </Button>
        </div>
      )}

      {generating && (
        <div className="bg-primary/5 text-primary flex items-center gap-2 rounded-lg border border-primary/20 px-3 py-2 text-sm">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Генерируем тексты...
        </div>
      )}

      <div className="grid gap-4">
        {texts.map((t) => {
          const open = expanded[t.id] === true;
          return (
            <Card key={t.id} className="border-border">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected[t.id] === true}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({
                          ...prev,
                          [t.id]: v === true,
                        }))
                      }
                      aria-label="Забрать в работу"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{t.approach}</Badge>
                      <Badge variant="outline">{t.segment_name}</Badge>
                      <Badge>{formatLabel(String(t.text_format))}</Badge>
                    </div>
                  </div>
                </div>
                <CardTitle className="text-[1.38rem] font-bold leading-snug tracking-[-0.02em]">
                  {t.headline}
                </CardTitle>
                <CardDescription className="text-foreground whitespace-pre-wrap">
                  {t.body}
                </CardDescription>
                <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">CTA: </span>
                    <span>{t.cta}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Кнопка: </span>
                    <span className="font-medium">{t.cta_button}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [t.id]: !open,
                    }))
                  }
                >
                  <span>Почему этот подход</span>
                  {open ? (
                    <ChevronUp className="size-4" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden />
                  )}
                </Button>
                {open && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t.approach_explanation}
                  </p>
                )}

                <div className="text-muted-foreground grid gap-1 text-xs">
                  <div>
                    <span className="font-medium text-foreground">Боль: </span>
                    {t.pain_point_addressed}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Воронка: </span>
                    {t.funnel_stage}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => copyText(t)}
                  className="w-full gap-2 sm:w-auto"
                >
                  <Copy className="size-4" aria-hidden />
                  Копировать текст
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Обратная связь</CardTitle>
          <CardDescription>
            Напишите, что улучшить — мы перегенерируем с учётом комментариев
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Что нравится, что не нравится? Что изменить?"
            rows={4}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || !feedback.trim()}
              onClick={() => {
                void runGeneration({
                  mode: "feedback",
                  feedbackText: feedback,
                  currentCount: texts.length,
                  existingForFeedback: texts.map(stripId),
                }).then(() => setFeedback(""));
              }}
            >
              Перегенерировать с учётом фидбека
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void runGeneration({ mode: "append" })}
            >
              Сгенерировать ещё
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/project/${projectId}/configure`)}
        >
          ← Назад к настройкам
        </Button>
        <Button type="button" onClick={() => router.push("/projects")}>
          Готово — к списку проектов
        </Button>
      </div>
    </div>
  );
}
