"use client";

import { useMemo, useState } from "react";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { GeneratedAdText, GeneratedTextBatch } from "@/lib/types/generated-texts";
import { productLabelForModel } from "@/lib/model-options";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  batch: GeneratedTextBatch;
  defaultOpen?: boolean;
  selectedTextIds: Set<string>;
  onToggleText: (id: string) => void;
  onRefresh: () => void;
};

function formatBatchDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTextBlock(t: GeneratedAdText): string {
  return `${t.headline}\n\n${t.body}\n\n${t.cta}\n\nКнопка: ${t.cta_button}`;
}

function textKey(batchId: string, i: number): string {
  return `${batchId}:${i}`;
}

export function BatchCard({
  projectId,
  batch,
  defaultOpen = false,
  selectedTextIds,
  onToggleText,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const texts = batch.texts ?? [];
  const modelLabel = productLabelForModel(batch.model);

  const title = useMemo(() => {
    const date = batch.created_at ? formatBatchDate(batch.created_at) : "дата неизвестна";
    return `Генерация #${batch.batch_number} · ${date} · модель ${modelLabel} · ${texts.length} текстов`;
  }, [batch.batch_number, batch.created_at, modelLabel, texts.length]);

  const copyOne = async (t: GeneratedAdText) => {
    try {
      await navigator.clipboard.writeText(formatTextBlock(t));
      toast.success("Скопировано");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const deleteBatch = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/texts/${batch.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось удалить генерацию");
      }
      toast.success("Генерация удалена");
      setDeleteOpen(false);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-start gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "mt-0.5 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground",
              "hover:bg-muted hover:text-foreground"
            )}
            aria-label={open ? "Свернуть" : "Развернуть"}
          >
            <span className={cn("transition-transform", open ? "rotate-90" : "")}>
              ▸
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{title}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            aria-label="Удалить генерацию"
          >
            <Trash2 className="size-4" aria-hidden />
            Удалить
          </Button>
        </div>

        {open && (
          <div className="border-t border-border px-4 py-4 space-y-3">
            {batch.run_context && (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Контекст генерации:</span>{" "}
                {batch.run_context}
              </div>
            )}

            {texts.map((t, i) => {
              const id = textKey(batch.id, i);
              const checked = selectedTextIds.has(id);
              return (
                <div
                  key={id}
                  className="flex gap-3 rounded-lg border border-border/80 bg-muted/10 p-3"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggleText(id)}
                    className="mt-1"
                    aria-label="Выбрать текст"
                  />
                  <div className="min-w-0 flex-1 space-y-2 text-sm">
                    <p className="font-semibold">{t.headline}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {t.body}
                    </p>
                    <p className="text-foreground">{t.cta}</p>
                    <p className="text-xs text-muted-foreground">Кнопка: {t.cta_button}</p>
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
        )}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить генерацию?</DialogTitle>
            <DialogDescription>
              Генерация #{batch.batch_number} будет удалена безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void deleteBatch()}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

