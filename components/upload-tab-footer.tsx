"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  ANALYSIS_MODEL_OPTIONS,
  type AnalysisModelId,
} from "@/lib/analysis-model-options";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  projectBasePath: string;
  analysisStatus: string;
  materialsCount: number;
  description?: string | null;
  selectedAnalysisModel: AnalysisModelId;
  onSelectedAnalysisModelChange: (id: AnalysisModelId) => void;
};

export function UploadTabFooter({
  projectId,
  projectBasePath,
  analysisStatus,
  materialsCount,
  description,
  selectedAnalysisModel,
  onSelectedAnalysisModelChange,
}: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const hasContext =
    materialsCount > 0 || ((description?.trim().length ?? 0) >= 50);

  const startAnalysis = async () => {
    setStarting(true);
    fetch(`/api/projects/${projectId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisModelId: selectedAnalysisModel }),
    }).catch((err) => console.error("[upload-footer] analyze failed", err));
    await new Promise((r) => setTimeout(r, 300));
    window.location.href = `${projectBasePath}/analysis`;
  };

  const goToAnalysis = () => {
    router.push(`${projectBasePath}/analysis`);
  };

  let label = "Дальше → Запустить анализ";
  let variant: "default" | "secondary" = "default";
  let disabled = false;
  let showSpinner = false;
  let hint: string | null = null;

  if (analysisStatus === "pending") {
    if (!hasContext) {
      label = "Добавьте контекст";
      disabled = true;
      hint =
        'Загрузите материал или опишите задачу в блоке "Дополнительная информация", чтобы запустить анализ ЦА';
    } else if (starting) {
      label = "Анализ идёт... (~1 минута)";
      disabled = true;
      showSpinner = true;
    }
  } else if (analysisStatus === "analyzing") {
    label = "Анализ выполняется…";
    disabled = true;
    showSpinner = true;
    hint = "Это займёт около минуты";
  } else if (analysisStatus === "ready") {
    label = "Дальше → К анализу";
    variant = "secondary";
  } else if (analysisStatus === "failed") {
    label = "Перезапустить анализ";
    if (!hasContext) {
      disabled = true;
      hint =
        'Загрузите материал или опишите задачу в блоке "Дополнительная информация", чтобы запустить анализ ЦА';
    } else if (starting) {
      label = "Анализ идёт... (~1 минута)";
      disabled = true;
      showSpinner = true;
    } else {
      hint = "Анализ не прошёл — попробуйте снова";
    }
  } else if (starting) {
    label = "Анализ идёт... (~1 минута)";
    disabled = true;
    showSpinner = true;
  }

  const onClick = () => {
    if (analysisStatus === "ready") return goToAnalysis();
    void startAnalysis();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Модель анализа</h3>
          <p className="text-xs text-muted-foreground">
            Влияет на глубину и время анализа
          </p>
        </div>
        <RadioGroup
          value={selectedAnalysisModel}
          onValueChange={(v) => onSelectedAnalysisModelChange(v as AnalysisModelId)}
          className="grid gap-2"
        >
          {ANALYSIS_MODEL_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-white px-3 py-2 transition-colors hover:bg-muted/30",
                selectedAnalysisModel === opt.id &&
                  "border-l-2 border-l-violet-500 bg-violet-50 ring-1 ring-violet-500/20"
              )}
            >
              <RadioGroupItem
                value={opt.id}
                className="border-input text-violet-600 data-checked:border-violet-600 data-checked:bg-violet-600 data-checked:text-white [&_[data-slot=radio-group-indicator]_span]:bg-white"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {hint && <span className="mr-auto text-xs text-muted-foreground">{hint}</span>}
        <Button
          type="button"
          variant={variant}
          disabled={disabled || starting}
          onClick={onClick}
          className="gap-2"
        >
          {(showSpinner || starting) && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          {label}
        </Button>
      </div>
    </div>
  );
}

