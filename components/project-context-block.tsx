"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  projectId: string;
  initialDescription: string | null;
};

const SAVE_DEBOUNCE_MS = 600;

export function ProjectContextBlock({ projectId, initialDescription }: Props) {
  const [value, setValue] = useState(initialDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    setValue(initialDescription ?? "");
  }, [initialDescription]);

  const persist = async (next: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      setSavedAt(Date.now());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void persist(value);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Дополнительная информация</CardTitle>
          <CardDescription>
            Опишите задачу своими словами — что важно учесть, на чём акцент, для
            кого пишем. AI прочитает это перед анализом ЦА.
          </CardDescription>
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
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          placeholder="Например: нужны посты для рекламы сообщества для таргетологов. Аудитория — начинающие специалисты с опытом до 1 года. Тон — экспертный, но не снобский."
        />
      </CardContent>
    </Card>
  );
}

