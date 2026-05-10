"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Loader2 } from "lucide-react";

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
import { cn } from "@/lib/utils";

// --- from /tmp/old-v1-types.ts (inline, no storage keys) ---

type ClaudeModel =
  | "claude-haiku-4-5-20251001"
  | "claude-sonnet-4-6"
  | "claude-opus-4-6";

const MODEL_OPTIONS = [
  {
    value: "claude-haiku-4-5-20251001" as ClaudeModel,
    label: "Haiku 4.5 — быстрый, экономичный",
    price: "~8 ₽/проект",
  },
  {
    value: "claude-sonnet-4-6" as ClaudeModel,
    label: "Sonnet 4.6 — баланс цены и качества",
    price: "~26 ₽/проект",
  },
  {
    value: "claude-opus-4-6" as ClaudeModel,
    label: "Opus 4.6 — максимальное качество",
    price: "~43 ₽/проект",
  },
] as const;

type TrafficDestination =
  | "vk_lead"
  | "senler"
  | "community_messages"
  | "community_subscribe"
  | "site"
  | "marketplace"
  | "quiz"
  | "avito";

type TextFormat = "short" | "long" | "mixed";

const TRAFFIC_OPTIONS: Array<{
  value: TrafficDestination;
  label: string;
}> = [
  { value: "vk_lead", label: "Лид-форма ВК" },
  { value: "senler", label: "Чат-бот (Senler)" },
  { value: "community_messages", label: "Сообщения сообщества" },
  { value: "community_subscribe", label: "Подписка на сообщество" },
  { value: "site", label: "Сайт / лендинг" },
  { value: "marketplace", label: "Маркетплейс (WB / Ozon)" },
  { value: "quiz", label: "Квиз" },
  { value: "avito", label: "Авито" },
];

const TEXT_FORMAT_OPTIONS: Array<{
  value: TextFormat;
  label: string;
}> = [
  { value: "short", label: "Короткие (300-500 символов)" },
  { value: "long", label: "Длинные (700-1200 символов)" },
  { value: "mixed", label: "Микс (и короткие, и длинные)" },
];

// --- from /tmp/old-v1-stepper.tsx (static active step = Настройка) ---

const STEPS = [
  { id: 1, label: "Загрузка" },
  { id: 2, label: "Анализ" },
  { id: 3, label: "Настройка" },
  { id: 4, label: "Тексты" },
] as const;

const ACTIVE_STEP = 3 as const;

function PreviewStepper() {
  const active = ACTIVE_STEP;

  return (
    <nav
      aria-label="Этапы проекта"
      className="border-border bg-card mb-8 flex flex-wrap items-center gap-1 rounded-[12px] border px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      {STEPS.map((step, index) => {
        const isActive = step.id === active;
        const isPast = step.id < active;
        const isFuture = step.id > active;

        return (
          <div key={step.id} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                className="text-muted-foreground mx-1 size-4 shrink-0"
                aria-hidden
              />
            )}
            <span
              className={cn(
                "flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-[14px] font-medium transition-colors outline-none",
                isActive && "text-blue-600",
                isPast && !isActive && "text-blue-600",
                isFuture && "text-gray-400",
                "hover:bg-[#f9fafb]"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isActive && "bg-blue-600 text-white",
                  isPast && !isActive && "bg-blue-600 text-white",
                  isFuture && "bg-gray-200 text-gray-400"
                )}
              >
                {isPast && !isActive ? (
                  <Check className="size-4" strokeWidth={2.5} aria-hidden />
                ) : (
                  step.id
                )}
              </span>
              <span>{step.label}</span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}

const MOCK_SEGMENTS = [
  { name: "Малый бизнес, услуги в городе" },
  { name: "Самозанятые и фрилансеры" },
] as const;

export default function PreviewConfigureVeryOldPage() {
  const analysis = useMemo(
    () => ({
      segments: [...MOCK_SEGMENTS],
    }),
    []
  );

  const [traffic, setTraffic] = useState<TrafficDestination>("vk_lead");
  const [format, setFormat] = useState<TextFormat>("mixed");
  const [model, setModel] = useState<ClaudeModel>("claude-sonnet-4-6");
  const [count, setCount] = useState<string>("5");
  const [wishes, setWishes] = useState(
    "Сделай упор на конкретику и цифры, без канцелярита."
  );
  const [generating, setGenerating] = useState(false);

  const selectedSegments = useMemo(() => {
    const selectedIndices = [0, 1];
    return selectedIndices
      .filter((i) => i >= 0 && i < analysis.segments.length)
      .map((i) => analysis.segments[i])
      .filter(Boolean);
  }, [analysis.segments]);

  function handleGenerate() {
    const textCount = Number.parseInt(count, 10);
    if (!Number.isFinite(textCount) || textCount < 1 || textCount > 10) {
      return;
    }
    setGenerating(true);
    window.setTimeout(() => setGenerating(false), 1200);
  }

  return (
    <div className="bg-background min-h-screen">
      <div
        className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm text-amber-950"
        role="status"
      >
        ⚠ Превью самой ранней версии (v1) — для скриншотов, будет удалён
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <PreviewStepper />

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
              <span
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "cursor-default"
                )}
              >
                Изменить выбор
              </span>
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
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                      "hover:bg-[#f9fafb]",
                      opt.value === traffic
                        ? "border-border border-l-[3px] border-l-blue-600 bg-blue-50"
                        : "border-border bg-card"
                    )}
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
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                      "hover:bg-[#f9fafb]",
                      opt.value === format
                        ? "border-border border-l-[3px] border-l-blue-600 bg-blue-50"
                        : "border-border bg-card"
                    )}
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
                        ? "border-blue-600/50 border-l-[3px] border-l-blue-600 bg-blue-50"
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
              className="gap-2 px-6 bg-blue-600 text-white hover:bg-blue-700"
              disabled={
                generating || !analysis || selectedSegments.length === 0
              }
              onClick={() => void handleGenerate()}
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Генерируем…
                </>
              ) : (
                "Сгенерировать тексты"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
