"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { productLabelForModel } from "@/lib/model-options";
import type {
  GeneratedAdText,
  GeneratedTextBatch,
} from "@/lib/types/generated-texts";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  campaignId: string;
  batches: GeneratedTextBatch[];
};

function sk(batchId: string, index: number): string {
  return `${batchId}:${index}`;
}

function formatBatchDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTextBlock(t: GeneratedAdText): string {
  return `${t.headline}\n\n${t.body}\n\n${t.cta}\n\nКнопка: ${t.cta_button}`;
}

export function CampaignTextsView({
  projectId,
  campaignId,
  batches,
}: Props) {
  const router = useRouter();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const toggleKey = (k: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const selectAll = () => {
    const next = new Set<string>();
    for (const b of batches) {
      (b.texts ?? []).forEach((_, i) => next.add(sk(b.id, i)));
    }
    setSelectedKeys(next);
  };

  const clearSelection = () => setSelectedKeys(new Set());

  const collectSelectedTexts = (): string[] => {
    const out: string[] = [];
    for (const b of batches) {
      (b.texts ?? []).forEach((t, i) => {
        if (selectedKeys.has(sk(b.id, i))) out.push(formatTextBlock(t));
      });
    }
    return out;
  };

  const copySelected = async () => {
    const blocks = collectSelectedTexts();
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

  const copyOne = async (t: GeneratedAdText) => {
    try {
      await navigator.clipboard.writeText(formatTextBlock(t));
      toast.success("Скопировано");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const downloadSelected = () => {
    const blocks = collectSelectedTexts();
    if (blocks.length === 0) {
      toast("Ничего не выбрано");
      return;
    }
    const blob = new Blob([blocks.join("\n\n═══\n\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-texts-${campaignId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Файл сохранён");
  };

  const generateMore = async () => {
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
      toast.success("Новый прогон добавлен");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setGenerating(false);
    }
  };

  const configureHref = `/projects/${projectId}/campaigns/${campaignId}/configure`;

  if (batches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Сгенерированные тексты</CardTitle>
          <CardDescription>
            Текстов ещё нет. Вернитесь к настройке и запустите генерацию.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={configureHref}
            className={cn(buttonVariants({ variant: "outline", size: "default" }))}
          >
            ← К настройке
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Сгенерированные тексты
          </h1>
          <p className="text-sm text-muted-foreground">
            Прогоны в обратном хронологическом порядке. Раскройте блок, чтобы
            скопировать или отметить варианты.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={generating}
          onClick={() => void generateMore()}
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Сгенерировать ещё
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
          Выбрать всё
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
          Снять выбор
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copySelected()}
        >
          <Copy className="size-3.5" aria-hidden />
          Скопировать выбранные
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={downloadSelected}>
          <Download className="size-3.5" aria-hidden />
          Скачать выбранные
        </Button>
      </div>

      <div className="space-y-3">
        {batches.map((batch, batchIndex) => {
          const texts = batch.texts ?? [];
          const modelLabel = productLabelForModel(batch.model);
          return (
            <details
              key={batch.id}
              className="group rounded-xl border border-border bg-card"
              open={batchIndex === 0}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-muted-foreground transition-transform group-open:rotate-90">
                  ▸
                </span>
                <span className="min-w-0 flex-1">
                  Прогон #{batch.batch_number},{" "}
                  {batch.created_at
                    ? formatBatchDate(batch.created_at)
                    : "дата неизвестна"}
                  , модель {modelLabel}, {texts.length}{" "}
                  {texts.length === 1 ? "текст" : "текстов"}
                </span>
              </summary>
              <div className="space-y-3 border-t border-border px-4 py-4">
                {texts.map((t, i) => {
                  const k = sk(batch.id, i);
                  const checked = selectedKeys.has(k);
                  return (
                    <div
                      key={k}
                      className="flex gap-3 rounded-lg border border-border/80 bg-muted/20 p-3"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleKey(k)}
                        className="mt-1"
                        aria-label="Выбрать текст"
                      />
                      <div className="min-w-0 flex-1 space-y-2 text-sm">
                        <p className="font-semibold">{t.headline}</p>
                        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                          {t.body}
                        </p>
                        <p className="text-foreground">{t.cta}</p>
                        <p className="text-xs text-muted-foreground">
                          Кнопка: {t.cta_button}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1"
                        onClick={() => void copyOne(t)}
                      >
                        <Copy className="size-3.5" aria-hidden />
                        Копировать
                      </Button>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      <div className="flex justify-start">
        <Link
          href={configureHref}
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          ← К настройке
        </Link>
      </div>
    </div>
  );
}
