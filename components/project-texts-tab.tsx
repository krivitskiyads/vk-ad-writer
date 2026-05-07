"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BatchCard } from "@/components/batch-card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { productLabelForModel } from "@/lib/model-options";
import type { Project } from "@/lib/types/project";
import type { GeneratedTextBatch } from "@/lib/types/generated-texts";
import type { GenerationSettings } from "@/lib/generation-settings";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  project: Project;
  settings: GenerationSettings | null;
  batches: GeneratedTextBatch[];
};

function lengthLabel(tf: string | null | undefined): string {
  if (tf === "short") return "Короткий";
  if (tf === "long") return "Длинный";
  if (tf === "mixed") return "Микс";
  return "Средний";
}

function formatTextBlock(t: any): string {
  return `${t.headline}\n\n${t.body}\n\n${t.cta}\n\nКнопка: ${t.cta_button}`;
}

function textKey(batchId: string, i: number): string {
  return `${batchId}:${i}`;
}

const LOADING_MESSAGES: string[] = [
  "Изучаем материалы…",
  "Готовим структуру…",
  "Создаём варианты…",
  "Финализируем…",
] as const;

export function ProjectTextsTab({ projectId, project, settings, batches }: Props) {
  const router = useRouter();
  const [runContext, setRunContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const loadingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const effectiveSettings = useMemo(() => {
    const s = settings;
    return {
      model: s?.model ?? "claude-sonnet-4-6",
      count: typeof s?.textCount === "number" && s.textCount > 0 ? s.textCount : 5,
      textFormat: s?.textFormat ?? "mixed",
    };
  }, [settings]);

  const settingsLabel = useMemo(() => {
    return `Будет использовано: модель ${productLabelForModel(effectiveSettings.model)}, ${effectiveSettings.count} текстов, длина ${lengthLabel(effectiveSettings.textFormat)}`;
  }, [effectiveSettings]);

  useEffect(() => {
    if (!loading) {
      if (loadingTimer.current) clearInterval(loadingTimer.current);
      loadingTimer.current = null;
      setLoadingMsg(LOADING_MESSAGES[0]);
      return;
    }
    if (loadingTimer.current) clearInterval(loadingTimer.current);
    let idx = 0;
    loadingTimer.current = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 2500);
    return () => {
      if (loadingTimer.current) clearInterval(loadingTimer.current);
      loadingTimer.current = null;
    };
  }, [loading]);

  const refresh = () => router.refresh();

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_context: runContext }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось сгенерировать тексты");
      }
      const saved = data as { texts?: any[] };
      setRunContext("");
      toast.success(`Готово${Array.isArray(saved.texts) ? `, ${saved.texts.length} текстов` : ""}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка генерации");
    } finally {
      setLoading(false);
    }
  };

  const selectAll = () => {
    const next = new Set<string>();
    for (const b of batches) {
      (b.texts ?? []).forEach((_: any, i: number) => next.add(textKey(b.id, i)));
    }
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleText = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collectSelected = (): string[] => {
    const out: string[] = [];
    for (const b of batches) {
      (b.texts ?? []).forEach((t: any, i: number) => {
        if (selectedIds.has(textKey(b.id, i))) out.push(formatTextBlock(t));
      });
    }
    return out;
  };

  const copySelected = async () => {
    const blocks = collectSelected();
    if (blocks.length === 0) {
      toast("Ничего не выбрано");
      return;
    }
    try {
      await navigator.clipboard.writeText(blocks.join("\n\n═══\n\n"));
      toast.success("Скопировано в буфер");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const downloadSelected = () => {
    const blocks = collectSelected();
    if (blocks.length === 0) {
      toast("Ничего не выбрано");
      return;
    }
    const blob = new Blob([blocks.join("\n\n═══\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-texts-${projectId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Генерация текстов</CardTitle>
          <CardDescription>
            Дополнительный контекст поможет уточнить задачу для этой генерации.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Дополнительный контекст для этой генерации (опц.)
            </div>
            <Textarea
              value={runContext}
              onChange={(e) => setRunContext(e.target.value)}
              rows={4}
              placeholder="Например: акцент на скидке 30%, или упор на эмоциональный заход"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{settingsLabel}</p>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full gap-2"
            onClick={() => void generate()}
            disabled={loading || project.analysis_status !== "ready"}
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {batches.length === 0 ? "Сгенерировать тексты" : "Сгенерировать ещё"}
          </Button>
          {loading && (
            <div className="text-center text-sm text-muted-foreground">
              {loadingMsg}
            </div>
          )}
        </CardContent>
      </Card>

      {batches.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                История генераций <span className="text-muted-foreground font-normal">({batches.length})</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
                Выбрать все
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Снять выбор
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => void copySelected()}>
                <Copy className="size-3.5" aria-hidden />
                Копировать выбранные
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={downloadSelected}>
                <Download className="size-3.5" aria-hidden />
                Скачать выбранные
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {batches.map((b, i) => (
              <BatchCard
                key={b.id}
                projectId={projectId}
                batch={b}
                defaultOpen={i === 0}
                selectedTextIds={selectedIds}
                onToggleText={toggleText}
                onRefresh={refresh}
              />
            ))}
          </div>

          <div className="flex justify-end pt-6 border-t mt-8">
            <Link
              href="/projects"
              className={cn(buttonVariants({ variant: "outline", size: "default" }))}
            >
              Готово → К списку проектов
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

