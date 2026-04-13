"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  type GenerationSettings,
} from "@/lib/generation-settings";
import { isProjectAnalysis } from "@/lib/types/project-analysis";
import type { GeneratedAdText } from "@/lib/types/generated-texts";
const STORAGE_KEY_ANALYSIS = "project_analysis";
const STORAGE_KEY_SELECTED_SEGMENTS = "selected_segments";
const STORAGE_KEY_REFERENCE_TEXTS = "project_reference_texts";

type ProjectTextsViewProps = {
  projectId: string;
};

type StoredText = GeneratedAdText & { id: string };

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

function buildCopyPayload(t: GeneratedAdText) {
  return [t.headline, "", t.body, "", t.cta].filter(Boolean).join("\n");
}

export function ProjectTextsView({ projectId }: ProjectTextsViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texts, setTexts] = useState<StoredText[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");

  const loadGeneration = useCallback(
    async (opts?: {
      mode: "initial" | "append" | "feedback";
      feedbackText?: string;
      currentCount?: number;
      existingForFeedback?: GeneratedAdText[];
    }) => {
      setLoading(true);
      setError(null);

      try {
        const analysisRaw = localStorage.getItem(STORAGE_KEY_ANALYSIS);
        const analysis = readJson<unknown>(analysisRaw);
        if (!isProjectAnalysis(analysis)) {
          throw new Error("Нет анализа проекта. Пройдите шаг анализа.");
        }

        const selRaw = localStorage.getItem(STORAGE_KEY_SELECTED_SEGMENTS);
        const indices = readJson<number[]>(selRaw);
        if (!Array.isArray(indices) || indices.length === 0) {
          throw new Error("Не выбраны сегменты. Вернитесь к анализу.");
        }

        const gsRaw = localStorage.getItem(STORAGE_KEY_GENERATION_SETTINGS);
        const gs = readJson<Partial<GenerationSettings>>(gsRaw);
        if (
          !gs ||
          !gs.trafficDestination ||
          !gs.textFormat ||
          typeof gs.textCount !== "number"
        ) {
          throw new Error("Нет настроек генерации. Заполните шаг «Настройка».");
        }

        const selectedSegments = indices
          .filter((i) => i >= 0 && i < analysis.segments.length)
          .map((i) => analysis.segments[i]);

        const referenceTexts =
          localStorage.getItem(STORAGE_KEY_REFERENCE_TEXTS) ?? "";

        const mode = opts?.mode ?? "initial";
        const append = mode === "append";
        const feedbackMode = mode === "feedback";
        const feedbackText = feedbackMode ? opts?.feedbackText?.trim() : undefined;

        const countForRequest =
          mode === "append"
            ? gs.textCount
            : feedbackMode
              ? Math.min(
                  10,
                  Math.max(1, opts?.currentCount ?? gs.textCount)
                )
              : gs.textCount;

        const existingForFeedback =
          feedbackMode && (opts?.existingForFeedback?.length ?? 0) > 0
            ? opts?.existingForFeedback
            : undefined;

        const res = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysis,
            selectedSegments,
            trafficDestination: trafficDestinationLabel(gs.trafficDestination),
            textFormat: gs.textFormat,
            textCount: countForRequest,
            customWishes: gs.customWishes ?? "",
            referenceTexts,
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

        const mapped: StoredText[] = nextTextsUnknown.map((t) => ({
          id: crypto.randomUUID(),
          ...(t as GeneratedAdText),
        }));

        setTexts((prev) => {
          if (append) return [...prev, ...mapped];
          return mapped;
        });
        setSelected({});
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    void loadGeneration({ mode: "initial" });
  }, [loadGeneration]);

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
    const payload = chosen.map(buildCopyPayload).join("\n---\n");
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
    const payload = chosen.map(buildCopyPayload).join("\n---\n");
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vk-texts-${projectId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading && texts.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/50 px-6 py-16">
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
          <h1 className="text-2xl font-semibold tracking-tight">Тексты</h1>
          <p className="text-muted-foreground mt-1 text-sm">
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
              onClick={() => void loadGeneration({ mode: "initial" })}
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
          <h1 className="text-2xl font-semibold tracking-tight">Тексты</h1>
          <p className="text-muted-foreground mt-1 text-sm">
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
          <Button type="button" variant="outline" onClick={copySelected}>
            Копировать выбранные
          </Button>
          <Button type="button" variant="outline" onClick={downloadSelected}>
            <Download className="mr-2 size-4" aria-hidden />
            Скачать выбранные
          </Button>
        </div>
      </div>

      {loading && (
        <div className="bg-primary/5 text-primary flex items-center gap-2 rounded-lg border border-primary/20 px-3 py-2 text-sm">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Генерируем тексты...
        </div>
      )}

      <div className="grid gap-4">
        {texts.map((t) => {
          const open = expanded[t.id] === true;
          return (
            <Card key={t.id} className="border-border/80 shadow-sm">
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
                <CardTitle className="text-xl leading-snug">{t.headline}</CardTitle>
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

      <Card className="border-border/80 shadow-sm">
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
              disabled={loading || !feedback.trim()}
              onClick={() => {
                void loadGeneration({
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
              disabled={loading}
              onClick={() => void loadGeneration({ mode: "append" })}
            >
              Сгенерировать ещё
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
