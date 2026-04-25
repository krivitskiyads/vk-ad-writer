"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MODEL_OPTIONS,
  STORAGE_KEY_GENERATION_SETTINGS,
  TEXT_FORMAT_OPTIONS,
  TRAFFIC_OPTIONS,
  type ClaudeModel,
  type GenerationSettings,
  type TextFormat,
  type TrafficDestination,
} from "@/lib/generation-settings";
import { toProjectAnalysis } from "@/lib/types/project-analysis";
import type { ProjectAnalysis } from "@/lib/types/project-analysis";
import { cn } from "@/lib/utils";

const STORAGE_KEY_ANALYSIS = "project_analysis";
const STORAGE_KEY_SELECTED_SEGMENTS = "selected_segments";

type ProjectConfigureViewProps = {
  projectId: string;
};

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function ProjectConfigureView({ projectId }: ProjectConfigureViewProps) {
  const router = useRouter();

  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const [traffic, setTraffic] = useState<TrafficDestination>("vk_lead");
  const [format, setFormat] = useState<TextFormat>("mixed");
  const [model, setModel] = useState<ClaudeModel>("claude-sonnet-4-6");
  const [count, setCount] = useState<string>("5");
  const [wishes, setWishes] = useState("");

  useEffect(() => {
    try {
      const aRaw = localStorage.getItem(STORAGE_KEY_ANALYSIS);
      const parsedA = readJson<unknown>(aRaw);
      const normalizedA = toProjectAnalysis(parsedA);
      if (normalizedA) {
        setAnalysis(normalizedA);
      }

      const selRaw = localStorage.getItem(STORAGE_KEY_SELECTED_SEGMENTS);
      const sel = readJson<number[]>(selRaw);
      if (Array.isArray(sel) && sel.every((x) => typeof x === "number")) {
        setSelectedIndices(sel);
      }

      const gsRaw = localStorage.getItem(STORAGE_KEY_GENERATION_SETTINGS);
      const gs = readJson<Partial<GenerationSettings>>(gsRaw);
      if (gs) {
        if (gs.trafficDestination) setTraffic(gs.trafficDestination);
        if (gs.textFormat) setFormat(gs.textFormat);
        if (gs.model) setModel(gs.model);
        if (typeof gs.textCount === "number") setCount(String(gs.textCount));
        if (typeof gs.customWishes === "string") setWishes(gs.customWishes);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const textCount = Number.parseInt(count, 10);
    if (!Number.isFinite(textCount) || textCount < 1 || textCount > 10) return;

    const settings: GenerationSettings = {
      trafficDestination: traffic,
      textFormat: format,
      textCount,
      customWishes: wishes,
      model,
    };

    try {
      localStorage.setItem(
        STORAGE_KEY_GENERATION_SETTINGS,
        JSON.stringify(settings)
      );
    } catch {
      // ignore
    }
  }, [traffic, format, count, wishes, model]);

  const selectedSegments = useMemo(() => {
    if (!analysis) return [];
    return selectedIndices
      .filter((i) => i >= 0 && i < analysis.segments.length)
      .map((i) => analysis.segments[i])
      .filter(Boolean);
  }, [analysis, selectedIndices]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="notion-page-title">Настройка генерации</h1>
        <p className="notion-page-subtitle">
          Задайте параметры перед генерацией рекламных текстов
        </p>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Выбранные сегменты</CardTitle>
            <CardDescription>
              Эти сегменты будут использованы для генерации
            </CardDescription>
          </div>
          <Link
            href={`/project/${projectId}/analysis`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Изменить выбор
          </Link>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {selectedSegments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Сегменты не выбраны. Вернитесь к анализу и отметьте сегменты.
            </p>
          ) : (
            selectedSegments.map((s, idx) => (
              <Badge key={`${s.name}-${idx}`} variant="secondary">
                {s.name}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Куда ведём трафик?</CardTitle>
          <CardDescription>Это влияет на CTA и тональность</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup
            value={traffic}
            onValueChange={(v) => setTraffic(v as TrafficDestination)}
            className="grid gap-2"
          >
            {TRAFFIC_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                  "hover:bg-[#f9fafb]",
                  opt.value === traffic
                    ? "border-l-[3px] border-l-[#7c3aed] bg-[#f5f3ff]"
                    : "border-border bg-card",
                ].join(" ")}
              >
                <RadioGroupItem value={opt.value} />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Формат текстов</CardTitle>
          <CardDescription>Длина основного текста объявления</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as TextFormat)}
            className="grid gap-2"
          >
            {TEXT_FORMAT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                  "hover:bg-[#f9fafb]",
                  opt.value === format
                    ? "border-l-[3px] border-l-[#7c3aed] bg-[#f5f3ff]"
                    : "border-border bg-card",
                ].join(" ")}
              >
                <RadioGroupItem value={opt.value} />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Модель Claude</CardTitle>
          <CardDescription>Влияет на качество текстов и стоимость</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup
            value={model}
            onValueChange={(v) => setModel(v as ClaudeModel)}
            className="grid gap-2"
          >
            {MODEL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2",
                  model === opt.value
                    ? "border-primary/50 bg-primary/5 border-l-[3px] border-l-primary"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={opt.value} />
                  <span className="text-sm">{opt.label}</span>
                </div>
                <span className="text-muted-foreground text-xs">{opt.price}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Сколько текстов?</CardTitle>
          <CardDescription>От 1 до 10</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="text-count">Количество</Label>
          <Select
            value={count}
            onValueChange={(v) => {
              if (v) setCount(v);
            }}
          >
            <SelectTrigger id="text-count" className="w-full max-w-xs">
              <SelectValue placeholder="Выберите" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Пожелания (необязательно)</CardTitle>
          <CardDescription>Любые уточнения по стилю и акцентам</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={wishes}
            onChange={(e) => setWishes(e.target.value)}
            placeholder='Например: сделай упор на боль с ценами, используй разговорный стиль, добавь конкретные цифры...'
            rows={5}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          size="lg"
          className="px-6"
          disabled={!analysis || selectedSegments.length === 0}
          onClick={() => {
            const textCount = Number.parseInt(count, 10);
            if (!Number.isFinite(textCount) || textCount < 1 || textCount > 10) {
              return;
            }

            const settings: GenerationSettings = {
              trafficDestination: traffic,
              textFormat: format,
              textCount,
              customWishes: wishes,
              model,
            };

            try {
              localStorage.setItem(
                STORAGE_KEY_GENERATION_SETTINGS,
                JSON.stringify(settings)
              );
            } catch {
              // ignore
            }

            router.push(`/project/${projectId}/texts`);
          }}
        >
          Сгенерировать тексты
        </Button>
      </div>
    </div>
  );
}
