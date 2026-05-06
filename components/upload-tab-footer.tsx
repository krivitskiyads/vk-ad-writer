"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  projectId: string;
  analysisStatus: string;
  materialsCount: number;
  description?: string | null;
};

export function UploadTabFooter({
  projectId,
  analysisStatus,
  materialsCount,
  description,
}: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const hasContext =
    materialsCount > 0 || ((description?.trim().length ?? 0) >= 50);

  const startAnalysis = () => {
    setStarting(true);
    fetch(`/api/projects/${projectId}/analyze`, { method: "POST" }).catch(
      (err) => console.error("[upload-footer] analyze failed", err)
    );
    router.push(`/projects/${projectId}/analysis`);
  };

  const goToAnalysis = () => {
    router.push(`/projects/${projectId}/analysis`);
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
    }
  } else if (analysisStatus === "analyzing") {
    label = "Анализ выполняется…";
    disabled = true;
    showSpinner = true;
    hint = "Это займёт около 30 секунд";
  } else if (analysisStatus === "ready") {
    label = "Дальше → К анализу";
    variant = "secondary";
  } else if (analysisStatus === "failed") {
    label = "Перезапустить анализ";
    if (!hasContext) {
      disabled = true;
      hint =
        'Загрузите материал или опишите задачу в блоке "Дополнительная информация", чтобы запустить анализ ЦА';
    } else {
      hint = "Анализ не прошёл — попробуйте снова";
    }
  }

  const onClick = () => {
    if (analysisStatus === "ready") return goToAnalysis();
    return startAnalysis();
  };

  return (
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
  );
}

