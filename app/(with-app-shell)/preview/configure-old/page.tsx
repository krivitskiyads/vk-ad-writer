"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

// --- from /tmp/old-types.ts (inline) ---

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

// --- tone presets (from old campaign-configure-view) ---

const TONE_SELECT = [
  { value: "__default__", label: "По умолчанию" },
  { value: "Деловой", label: "Деловой" },
  { value: "Дружелюбный", label: "Дружелюбный" },
  { value: "Экспертный", label: "Экспертный" },
  { value: "Провокационный", label: "Провокационный" },
  { value: "__custom__", label: "Свой вариант…" },
] as const;

const MOCK_TECHNIQUE_GROUPS = [
  {
    title: "Триггеры",
    items: [
      { id: "t1", label: "Страх упустить выгоду (FOMO)" },
      { id: "t2", label: "Социальное доказательство" },
      { id: "t3", label: "Конкретная выгода в цифрах" },
    ],
  },
  {
    title: "Формулы подачи",
    items: [
      { id: "f1", label: "Проблема → решение → призыв" },
      { id: "f2", label: "История клиента" },
    ],
  },
  {
    title: "Структуры",
    items: [
      { id: "s1", label: "AIDA (внимание — интерес — желание — действие)" },
    ],
  },
] as const;

export default function PreviewConfigureOldPage() {
  const [model, setModel] = useState<ClaudeModel>("claude-sonnet-4-6");
  const [textCount, setTextCount] = useState(5);
  const [textFormat, setTextFormat] = useState<TextFormat>("mixed");
  const [trafficDestination, setTrafficDestination] =
    useState<TrafficDestination>("vk_lead");
  const [toneMode, setToneMode] = useState<string>("__default__");
  const [toneCustom, setToneCustom] = useState("");
  const [customWishes, setCustomWishes] = useState(
    "Акцент на выгоды для малого бизнеса, без канцелярита."
  );

  const [techniqueChecked, setTechniqueChecked] = useState<Record<string, boolean>>(
    () => ({
      t1: true,
      t2: true,
      f1: true,
      s1: false,
    })
  );
  const [resetting, setResetting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const toggleTechnique = (id: string) => {
    setTechniqueChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetFromProjectMock = () => {
    setResetting(true);
    window.setTimeout(() => {
      setTechniqueChecked({ t2: true, f2: true });
      setResetting(false);
    }, 400);
  };

  const runGenerateMock = () => {
    setGenerating(true);
    window.setTimeout(() => setGenerating(false), 1200);
  };

  return (
    <div className="bg-background min-h-screen">
      <div
        className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm text-amber-950"
        role="status"
      >
        ⚠ Превью старого дизайна — только для скриншотов. Будет удалён.
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Параметры генерации</CardTitle>
                <CardDescription>
                  Задайте объём и стиль — AI учтёт материалы и снимок ЦА кампании.
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3" aria-hidden /> сохранено
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Модель</Label>
              <RadioGroup
                value={model}
                onValueChange={(v) => setModel(v as ClaudeModel)}
                className="grid gap-3 sm:grid-cols-3"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="hover:bg-muted/40 flex cursor-pointer gap-3 rounded-lg border border-border p-3"
                  >
                    <RadioGroupItem value={opt.value} id={`model-${opt.value}`} />
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <p className="text-xs text-muted-foreground">{opt.price}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="max-w-xs space-y-2">
              <Label htmlFor="text-count">Количество текстов</Label>
              <Input
                id="text-count"
                type="number"
                min={3}
                max={10}
                value={textCount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setTextCount(Math.min(10, Math.max(3, Math.floor(n))));
                }}
              />
            </div>

            <div className="space-y-3">
              <Label>Длина</Label>
              <RadioGroup
                value={textFormat}
                onValueChange={(v) => setTextFormat(v as TextFormat)}
                className="flex flex-wrap gap-4"
              >
                {TEXT_FORMAT_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <RadioGroupItem value={o.value} id={`len-${o.value}`} />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Куда ведём трафик</Label>
              <RadioGroup
                value={trafficDestination}
                onValueChange={(v) => setTrafficDestination(v as TrafficDestination)}
                className="grid gap-2 sm:grid-cols-2"
              >
                {TRAFFIC_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <RadioGroupItem value={o.value} id={`traffic-${o.value}`} />
                    <span className="text-sm font-medium">{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="max-w-md space-y-2">
              <Label>Тон</Label>
              <Select
                value={toneMode}
                onValueChange={(v) => {
                  setToneMode(v ?? "__default__");
                  if (v !== "__custom__") setToneCustom("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тон" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_SELECT.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {toneMode === "__custom__" && (
                <Input
                  value={toneCustom}
                  onChange={(e) => setToneCustom(e.target.value)}
                  placeholder="Опишите желаемый тон"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-wishes">Пожелания к текстам</Label>
              <Textarea
                id="custom-wishes"
                value={customWishes}
                onChange={(e) => setCustomWishes(e.target.value)}
                rows={4}
                placeholder="Дополнительные пожелания…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Стратегия копирайтинга</CardTitle>
              <CardDescription>
                Техники для этой кампании. По умолчанию скопированы из проекта — их
                можно изменить.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void resetFromProjectMock()}
                disabled={resetting}
              >
                {resetting && (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                )}
                Сбросить выбор из проекта
              </Button>
              <div className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3" aria-hidden /> сохранено
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 rounded-lg border border-border p-4">
              {MOCK_TECHNIQUE_GROUPS.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h4 className="text-sm font-semibold">{group.title}</h4>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md py-1"
                      >
                        <Checkbox
                          checked={Boolean(techniqueChecked[item.id])}
                          onCheckedChange={() => toggleTechnique(item.id)}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-snug">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-between gap-4">
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "cursor-default"
            )}
          >
            Назад
          </span>
          <Button
            type="button"
            size="lg"
            disabled={generating}
            className="min-w-[200px] gap-2 bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
            onClick={() => void runGenerateMock()}
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
