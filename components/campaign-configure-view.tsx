"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { TechniquesEditor } from "@/components/techniques-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { GenerationSettings, TextFormat } from "@/lib/generation-settings";
import {
  MODEL_PRESET_TO_CLAUDE,
  PRODUCT_MODEL_OPTIONS,
  claudeModelToPresetId,
  type ModelPresetId,
} from "@/lib/model-options";
import type { Campaign } from "@/lib/types/campaign";
import type { SelectedTechniques } from "@/lib/types/knowledge-base";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  campaign: Campaign;
  /** Текущие техники проекта — для кнопки «Вернуть выбор AI» в редакторе. */
  projectTechniques: SelectedTechniques | null;
  initialSettings: GenerationSettings;
};

const TECH_DEBOUNCE_MS = 600;
const SETTINGS_DEBOUNCE_MS = 600;

const EMPTY_TECHNIQUES: SelectedTechniques = {
  triggers: [],
  formulas: [],
  structures: [],
  reasoning: "",
};

const LENGTH_OPTIONS: Array<{
  value: TextFormat;
  label: string;
}> = [
  { value: "short", label: "Короткий" },
  { value: "mixed", label: "Средний" },
  { value: "long", label: "Длинный" },
];

const TONE_SELECT = [
  { value: "__default__", label: "По умолчанию" },
  { value: "Деловой", label: "Деловой" },
  { value: "Дружелюбный", label: "Дружелюбный" },
  { value: "Экспертный", label: "Экспертный" },
  { value: "Провокационный", label: "Провокационный" },
  { value: "__custom__", label: "Свой вариант…" },
];

function initialToneMode(settings: GenerationSettings): string {
  const t = (settings.tone ?? "").trim();
  if (!t) return "__default__";
  const preset = TONE_SELECT.find((o) => o.value === t);
  return preset ? t : "__custom__";
}

export function CampaignConfigureView({
  projectId,
  campaign,
  projectTechniques,
  initialSettings,
}: Props) {
  const router = useRouter();
  const campaignId = campaign.id;

  const [preset, setPreset] = useState<ModelPresetId>(() =>
    claudeModelToPresetId(initialSettings.model)
  );
  const [textCount, setTextCount] = useState(() =>
    Math.min(10, Math.max(3, Math.floor(initialSettings.textCount)))
  );
  const [textFormat, setTextFormat] = useState<TextFormat>(initialSettings.textFormat);
  const [toneMode, setToneMode] = useState<string>(() => initialToneMode(initialSettings));
  const [toneCustom, setToneCustom] = useState(() => {
    const t = (initialSettings.tone ?? "").trim();
    const preset = TONE_SELECT.find((o) => o.value === t);
    return preset ? "" : t;
  });

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsMount = useRef(true);

  const effectiveTone =
    toneMode === "__default__"
      ? ""
      : toneMode === "__custom__"
        ? toneCustom.trim()
        : toneMode.trim();

  const persistSettings = useCallback(async () => {
    setSettingsSaving(true);
    try {
      const model = MODEL_PRESET_TO_CLAUDE[preset];
      const res = await fetch(`/api/campaigns/${campaignId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          textCount: Math.min(10, Math.max(3, Math.floor(textCount))),
          textFormat,
          tone: effectiveTone,
          trafficDestination: initialSettings.trafficDestination,
          customWishes: initialSettings.customWishes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить настройки");
      }
      setSettingsSavedAt(Date.now());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSettingsSaving(false);
    }
  }, [
    campaignId,
    preset,
    textCount,
    textFormat,
    effectiveTone,
    initialSettings.trafficDestination,
    initialSettings.customWishes,
  ]);

  useEffect(() => {
    if (settingsMount.current) {
      settingsMount.current = false;
      return;
    }
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      void persistSettings();
    }, SETTINGS_DEBOUNCE_MS);
    return () => {
      if (settingsTimer.current) clearTimeout(settingsTimer.current);
    };
  }, [preset, textCount, textFormat, toneMode, toneCustom, persistSettings]);

  const [techniques, setTechniques] = useState<SelectedTechniques>(
    campaign.techniques_snapshot ?? EMPTY_TECHNIQUES
  );
  const [techSaving, setTechSaving] = useState(false);
  const [techSavedAt, setTechSavedAt] = useState<number | null>(null);
  const techTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const techMount = useRef(true);

  useEffect(() => {
    setTechniques(campaign.techniques_snapshot ?? EMPTY_TECHNIQUES);
  }, [campaign.techniques_snapshot, campaign.id]);

  const persistTechniques = useCallback(
    async (next: SelectedTechniques) => {
      setTechSaving(true);
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ techniques_snapshot: next }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Не удалось сохранить техники");
        }
        setTechSavedAt(Date.now());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
      } finally {
        setTechSaving(false);
      }
    },
    [campaignId]
  );

  useEffect(() => {
    if (techMount.current) {
      techMount.current = false;
      return;
    }
    if (techTimer.current) clearTimeout(techTimer.current);
    techTimer.current = setTimeout(() => {
      void persistTechniques(techniques);
    }, TECH_DEBOUNCE_MS);
    return () => {
      if (techTimer.current) clearTimeout(techTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techniques]);

  const [resetting, setResetting] = useState(false);
  const resetFromProject = async () => {
    setResetting(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/refresh-from-project`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось обновить");
      }
      toast.success("Техники и анализ подтянуты из проекта");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setResetting(false);
    }
  };

  const [generating, setGenerating] = useState(false);
  const runGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate`, {
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
      router.push(`/projects/${projectId}/campaigns/${campaignId}/texts`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setGenerating(false);
    }
  };

  const base = `/projects/${projectId}/campaigns/${campaignId}`;

  return (
    <div className="space-y-8">
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
              {settingsSaving ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> сохраняем…
                </span>
              ) : settingsSavedAt ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3" aria-hidden /> сохранено
                </span>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Модель</Label>
            <RadioGroup
              value={preset}
              onValueChange={(v) => setPreset(v as ModelPresetId)}
              className="grid gap-3 sm:grid-cols-3"
            >
              {PRODUCT_MODEL_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
                >
                  <RadioGroupItem value={opt.id} id={`model-${opt.id}`} />
                  <div className="space-y-0.5">
                    <span className="font-medium text-sm">
                      {opt.label}
                      {opt.recommended && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (рекомендуем)
                        </span>
                      )}
                    </span>
                    <p className="text-xs text-muted-foreground">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2 max-w-xs">
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
              {LENGTH_OPTIONS.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value={o.value} id={`len-${o.value}`} />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2 max-w-md">
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
              onClick={() => void resetFromProject()}
              disabled={resetting}
            >
              {resetting && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              )}
              Сбросить выбор из проекта
            </Button>
            <div className="text-xs text-muted-foreground">
              {techSaving ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> сохраняем…
                </span>
              ) : techSavedAt ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3" aria-hidden /> сохранено
                </span>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TechniquesEditor
            initialSelected={projectTechniques}
            value={techniques}
            onChange={setTechniques}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between gap-4">
        <Link
          href={`${base}/analysis`}
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          Назад
        </Link>
        <Button
          type="button"
          size="lg"
          disabled={generating}
          className="min-w-[200px] bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
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
  );
}
