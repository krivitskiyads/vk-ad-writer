"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Campaign } from "@/lib/types/campaign";
import { cn } from "@/lib/utils";
import {
  type ProjectAnalysis,
  toProjectAnalysis,
  withStableSegmentIds,
} from "@/lib/types/project-analysis";

type Props = {
  projectId: string;
  campaign: Campaign;
};

const SAVE_DEBOUNCE_MS = 600;

export function CampaignAnalysisView({ projectId, campaign }: Props) {
  const router = useRouter();
  const snapshot = useMemo(() => {
    const raw = campaign.analysis_snapshot as ProjectAnalysis | null;
    if (!raw) return null;
    return withStableSegmentIds(toProjectAnalysis(raw) ?? raw);
  }, [campaign.analysis_snapshot]);

  const allIds = useMemo(
    () =>
      (snapshot?.segments ?? [])
        .map((s) => s.id)
        .filter((x): x is string => typeof x === "string" && x.length > 0),
    [snapshot]
  );

  const [selected, setSelected] = useState<Set<string>>(() => {
    const ids = campaign.selected_segment_ids ?? [];
    if (ids.length > 0) return new Set(ids.filter((id) => allIds.includes(id)));
    return new Set(allIds);
  });

  useEffect(() => {
    const ids = campaign.selected_segment_ids ?? [];
    if (ids.length > 0) {
      setSelected(new Set(ids.filter((id) => allIds.includes(id))));
    } else {
      setSelected(new Set(allIds));
    }
  }, [campaign.id, campaign.selected_segment_ids, allIds]);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  const persist = async (next: Set<string>) => {
    if (next.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSegmentIds: Array.from(next) }),
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
      void persist(selected);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) {
          toast("Нужен хотя бы один сегмент");
          return prev;
        }
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [refreshOpen, setRefreshOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshFromProject = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaign.id}/refresh-from-project`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось обновить");
      }
      toast.success("Снимок обновлён из проекта");
      setRefreshOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setRefreshing(false);
    }
  };

  if (!snapshot) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Нет снимка анализа. Вернитесь в проект и выполните анализ ЦА.
        </CardContent>
      </Card>
    );
  }

  const base = `/projects/${projectId}/campaigns/${campaign.id}`;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Анализ ЦА для этой кампании</CardTitle>
          <CardDescription className="max-w-2xl">
            Этот анализ — снимок с момента создания кампании. Изменения в проекте
            на него не влияют. Если в проекте обновился анализ — нажмите
            «Обновить из проекта».
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Button type="button" variant="outline" onClick={() => setRefreshOpen(true)}>
            Обновить из проекта
          </Button>
          <div className="text-xs text-muted-foreground">
            {saving ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" aria-hidden /> сохраняем…
              </span>
            ) : savedAt ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="size-3" aria-hidden /> сохранено
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-3">
          {snapshot.segments.map((seg) => {
            const id = seg.id!;
            return (
              <li
                key={id}
                className="flex gap-3 rounded-lg border border-border bg-card p-4"
              >
                <Checkbox
                  id={`use-${id}`}
                  checked={selected.has(id)}
                  onCheckedChange={() => toggle(id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <label htmlFor={`use-${id}`} className="cursor-pointer font-medium">
                    {seg.name}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Использовать в этой кампании
                    </span>
                    {seg.description ? ` — ${seg.description}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap justify-between gap-3">
          <Link
            href={`${base}/upload`}
            className={cn(buttonVariants({ variant: "outline", size: "default" }))}
          >
            Назад
          </Link>
          <Link
            href={`${base}/configure`}
            className={cn(buttonVariants({ variant: "default", size: "default" }))}
          >
            Дальше → Настройка
          </Link>
        </div>
      </CardContent>

      <Dialog open={refreshOpen} onOpenChange={setRefreshOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обновить из проекта?</DialogTitle>
            <DialogDescription>
              Снимок анализа и стратегия техник в кампании будут заменены текущими
              данными проекта. Продолжить?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRefreshOpen(false)}
              disabled={refreshing}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => void refreshFromProject()}
              disabled={refreshing}
            >
              {refreshing && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Обновить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
