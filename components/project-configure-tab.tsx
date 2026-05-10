"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Minus, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { SegmentCardExpandable } from "@/components/segment-card-expandable";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { TEXT_FORMAT_OPTIONS } from "@/lib/generation-settings";
import {
  PRODUCT_MODEL_OPTIONS,
  type ModelPresetId,
} from "@/lib/model-options";
import type { Project } from "@/lib/types/project";
import type { AnalysisSegment, ProjectAnalysis } from "@/lib/types/project-analysis";
import { toProjectAnalysis, withStableSegmentIds } from "@/lib/types/project-analysis";
import type { SelectedTechniques } from "@/lib/types/knowledge-base";
import { cn } from "@/lib/utils";

type ApiSettings = {
  project_id: string;
  model: string;
  count: number;
  length: "micro" | "short" | "long" | "mixed";
  trafficDestination?: string;
  customWishes?: string;
};

type ModelId = "fast" | "optimal" | "max";
type LengthId = "micro" | "short" | "long" | "mixed";
type TrafficDestinationId =
  | "community"
  | "website"
  | "lead_magnet"
  | "lead_form"
  | "messages";

const SAVE_DEBOUNCE_MS = 600;
const TECH_SAVE_DEBOUNCE_MS = 500;

const MODEL_BY_ID: Record<ModelId, string> = {
  fast: "claude-haiku-4-5-20251001",
  optimal: "claude-sonnet-4-6",
  max: "claude-opus-4-6",
};

const TRAFFIC_BY_ID: Record<TrafficDestinationId, string> = {
  community: "community_subscribe",
  website: "site",
  lead_magnet: "quiz",
  lead_form: "vk_lead",
  messages: "community_messages",
};

const TRAFFIC_CHOICES: { id: TrafficDestinationId; label: string }[] = [
  { id: "community", label: "Сообщество ВКонтакте" },
  { id: "website", label: "Сайт или лендинг" },
  { id: "lead_magnet", label: "Лид-магнит или квиз" },
  { id: "lead_form", label: "Лид-форма ВКонтакте" },
  { id: "messages", label: "Сообщения сообщества" },
];

function trafficIdFromString(v: string | null | undefined): TrafficDestinationId {
  const x = (v ?? "").trim();
  if (x === "community_subscribe") return "community";
  if (x === "site") return "website";
  if (x === "quiz") return "lead_magnet";
  if (x === "vk_lead") return "lead_form";
  if (x === "community_messages") return "messages";
  return "website";
}

function modelIdFromString(model: string | null | undefined): ModelId {
  const m = (model ?? "").toLowerCase();
  if (m.includes("haiku")) return "fast";
  if (m.includes("opus")) return "max";
  return "optimal";
}

function toPreset(id: ModelId): ModelPresetId {
  if (id === "fast") return "fast";
  if (id === "max") return "premium";
  return "balanced";
}

function fromPreset(p: ModelPresetId): ModelId {
  if (p === "fast") return "fast";
  if (p === "premium") return "max";
  return "optimal";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function radioRowClass(selected: boolean): string {
  return cn(
    "flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-white px-3 py-2 transition-colors hover:bg-muted/30",
    selected &&
      "border-l-2 border-l-violet-500 bg-violet-50 ring-1 ring-violet-500/20"
  );
}

function radioItemClass(): string {
  return cn(
    "border-input text-violet-600 data-checked:border-violet-600 data-checked:bg-violet-600 data-checked:text-white",
    "[&_[data-slot=radio-group-indicator]_span]:bg-white"
  );
}

type Props = {
  projectId: string;
  project: Project;
  initialSettings: ApiSettings | null;
};

export function ProjectConfigureTab({ projectId, project, initialSettings }: Props) {
  const router = useRouter();

  const analysisNorm = useMemo(() => {
    const raw = project.analysis;
    if (!raw) return null;
    const p = toProjectAnalysis(raw);
    return p ? withStableSegmentIds(p) : null;
  }, [project.analysis]);

  const [analysisState, setAnalysisState] = useState<ProjectAnalysis | null>(
    analysisNorm
  );
  useEffect(() => setAnalysisState(analysisNorm), [analysisNorm]);

  const defaults: ApiSettings = useMemo(
    () => ({
      project_id: projectId,
      model: "claude-sonnet-4-6",
      count: 5,
      length: "mixed",
      customWishes: "",
    }),
    [projectId]
  );

  const init = initialSettings ?? defaults;
  const [modelId, setModelId] = useState<ModelId>(() => modelIdFromString(init.model));
  const [count, setCount] = useState(() => clamp(init.count ?? 5, 1, 10));
  const [length, setLength] = useState<LengthId>(() => init.length ?? "mixed");
  const [trafficId, setTrafficId] = useState<TrafficDestinationId>(() =>
    trafficIdFromString(init.trafficDestination)
  );
  const [wishes, setWishes] = useState(() => init.customWishes ?? "");

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  const [generating, setGenerating] = useState(false);

  const selectedSegments = useMemo(() => {
    if (!analysisState) return [];
    const ids = project.selected_segment_ids ?? [];
    return analysisState.segments.filter(
      (s): s is AnalysisSegment & { id: string } =>
        Boolean(s.id) && ids.includes(s.id!)
    );
  }, [analysisState, project.selected_segment_ids]);

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
  }, [modelId, count, length, wishes]);

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
          customWishes: wishes,
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

  const persistTraffic = async (nextId: TrafficDestinationId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trafficDestination: TRAFFIC_BY_ID[nextId] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  };

  const [techniques, setTechniques] = useState<SelectedTechniques | null>(
    project.selected_techniques ?? null
  );
  const [techSaving, setTechSaving] = useState(false);
  const [techSavedAt, setTechSavedAt] = useState<number | null>(null);
  const techTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTechniques(project.selected_techniques ?? null);
    // Синхронизируем только при смене проекта (как при router.refresh после сохранения).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useEffect(() => {
    return () => {
      if (techTimer.current) clearTimeout(techTimer.current);
    };
  }, []);

  const schedulePersistTechniques = (next: SelectedTechniques | null) => {
    if (techTimer.current) clearTimeout(techTimer.current);
    techTimer.current = setTimeout(() => {
      void persistTechniques(next);
    }, TECH_SAVE_DEBOUNCE_MS);
  };

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
    schedulePersistTechniques(ai);
  };

  const runGenerate = async () => {
    if (selectedSegments.length === 0) {
      toast.error("Выберите сегменты на вкладке «Анализ»");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Генерация не удалась"
        );
      }
      router.push(`/projects/${projectId}/texts`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setGenerating(false);
    }
  };

  const modelPreset = toPreset(modelId);

  return (
    <div className="space-y-6 bg-violet-50/50 rounded-xl border border-violet-100/80 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Выбранные сегменты</CardTitle>
              <CardDescription>
                Нажми на карточку чтобы развернуть и поправить текст сегмента
              </CardDescription>
            </div>
            <Link
              href={`/projects/${projectId}/analysis`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Изменить выбор
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSegments.length === 0 ? (
              <div className="space-y-3 rounded-lg border border-dashed border-border bg-white/80 px-4 py-6 text-center">
                <p className="text-muted-foreground text-sm">Нет выбранных сегментов</p>
                <Link
                  href={`/projects/${projectId}/analysis`}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  Перейти к анализу
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {analysisState &&
                  selectedSegments.map((s) => (
                    <SegmentCardExpandable
                      key={s.id}
                      projectId={projectId}
                      analysis={analysisState}
                      segment={s}
                      onSaved={(next) => setAnalysisState(next)}
                    />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Куда ведём трафик?</CardTitle>
            <CardDescription>Это влияет на CTA и тональность</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={trafficId}
              onValueChange={(v) => {
                const id = v as TrafficDestinationId;
                setTrafficId(id);
                void persistTraffic(id);
              }}
              className="grid gap-2"
            >
              {TRAFFIC_CHOICES.map((opt) => (
                <label
                  key={opt.id}
                  className={radioRowClass(trafficId === opt.id)}
                >
                  <RadioGroupItem
                    value={opt.id}
                    className={radioItemClass()}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Формат текстов</CardTitle>
            <CardDescription>Длина основного текста объявления</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={length}
              onValueChange={(v) => setLength(v as LengthId)}
              className="grid gap-2"
            >
              {TEXT_FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={radioRowClass(length === opt.value)}
                >
                  <RadioGroupItem
                    value={opt.value}
                    className={radioItemClass()}
                  />
                  <div className="min-w-0">
                    <span className="text-sm">{opt.label}</span>
                    {opt.hint ? (
                      <p className="text-muted-foreground text-xs">{opt.hint}</p>
                    ) : null}
                  </div>
                </label>
              ))}
            </RadioGroup>
            {length === "mixed" && (
              <p className="text-muted-foreground text-xs">
                Нейросеть сама подбирает длину под каждый текст — где-то короче,
                где-то развёрнуто
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Модель</CardTitle>
              <CardDescription>Влияет на качество текстов и скорость</CardDescription>
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
          <CardContent className="space-y-3">
            <RadioGroup
              value={modelPreset}
              onValueChange={(v) => setModelId(fromPreset(v as ModelPresetId))}
              className="grid gap-2"
            >
              {PRODUCT_MODEL_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={radioRowClass(modelPreset === opt.id)}
                >
                  <RadioGroupItem value={opt.id} className={radioItemClass()} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">
                      {opt.label}
                      {opt.recommended ? (
                        <span className="text-muted-foreground ml-1 text-xs font-normal">
                          (рекомендуем)
                        </span>
                      ) : null}
                    </span>
                    <p className="text-muted-foreground text-xs">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Сколько текстов?</CardTitle>
            <CardDescription>От 1 до 10</CardDescription>
          </CardHeader>
          <CardContent>
            <Label className="mb-2 block text-sm font-medium">Количество</Label>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1.5">
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
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Пожелания (необязательно)</CardTitle>
            <CardDescription>Любые уточнения по стилю и акцентам</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={wishes}
              onChange={(e) => setWishes(e.target.value)}
              placeholder="Например: сделай упор на боль с ценами, разговорный стиль, конкретные цифры…"
              rows={5}
              className="bg-white"
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-sm">
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
              onChange={(next) => {
                setTechniques(next);
                schedulePersistTechniques(next);
              }}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button
            type="button"
            size="lg"
            disabled={
              generating || selectedSegments.length === 0 || !analysisState
            }
            className="min-w-[200px] gap-2 bg-violet-600 text-white hover:bg-violet-700"
            onClick={() => void runGenerate()}
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Создаём варианты…
              </>
            ) : (
              "Сгенерировать тексты"
            )}
          </Button>
        </div>
      </div>

    </div>
  );
}
