"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectFile } from "@/lib/types/project-files";
import {
  MATERIAL_TAG_LABELS,
  MATERIAL_TAG_PILL_CLASS,
  MATERIAL_TAGS,
  type MaterialTag,
  type WorkspaceMaterialSummary,
} from "@/lib/types/workspace-materials";
import { cn } from "@/lib/utils";

const FILTER_ALL = "__all__";

function formatMaterialSize(m: WorkspaceMaterialSummary): string {
  if (m.content_tokens != null && m.content_tokens > 0) {
    return `≈ ${m.content_tokens.toLocaleString("ru-RU")} ток.`;
  }
  return "оценка не задана";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  projectId: string;
  onAttached: (files: ProjectFile[]) => void;
};

export function SelectFromLibraryDialog({
  open,
  onOpenChange,
  workspaceSlug,
  projectId,
  onAttached,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WorkspaceMaterialSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>(FILTER_ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceSlug)}/materials?summary=1`
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        materials?: WorkspaceMaterialSummary[];
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Не удалось загрузить библиотеку");
      }
      setItems(json.materials ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки";
      setLoadError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setFilterTag(FILTER_ALL);
      void load();
    }
  }, [open, load]);

  const filtered = useMemo(() => {
    if (filterTag === FILTER_ALL) return items;
    return items.filter((m) => m.tag === filterTag);
  }, [items, filterTag]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/files/from-library`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ material_ids: [...selected] }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        files?: ProjectFile[];
      };
      if (!res.ok || !json.files) {
        throw new Error(json.error ?? "Не удалось прикрепить материалы");
      }
      onAttached(json.files);
      toast.success(
        json.files.length === 1
          ? "Материал добавлен в проект"
          : `Добавлено материалов: ${json.files.length}`
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  const n = selected.size;

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent
        className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Библиотека workspace</DialogTitle>
            <DialogDescription>
              Выберите материалы — они скопируются в «Материалы клиента» этого
              проекта.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="library-tag-filter">Фильтр по тегу</Label>
              <Select
                value={filterTag}
                onValueChange={(v) => setFilterTag(v ?? FILTER_ALL)}
                disabled={loading || submitting}
              >
                <SelectTrigger id="library-tag-filter" className="w-full max-w-xs">
                  <SelectValue>
                    {filterTag === FILTER_ALL
                      ? "Все"
                      : MATERIAL_TAG_LABELS[filterTag as MaterialTag]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Все</SelectItem>
                  {MATERIAL_TAGS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MATERIAL_TAG_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2
                  className="size-8 animate-spin text-violet-500"
                  aria-hidden
                />
              </div>
            ) : loadError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {loadError}
              </p>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-10 text-center text-sm">
                <p className="text-muted-foreground">
                  В библиотеке пока нет материалов
                  {filterTag !== FILTER_ALL ? " с этим тегом" : ""}.
                </p>
                {filterTag === FILTER_ALL ? (
                  <Link
                    href={`/w/${workspaceSlug}/materials`}
                    className="mt-3 inline-block text-sm font-medium text-violet-700 underline-offset-4 hover:underline"
                  >
                    Открыть библиотеку
                  </Link>
                ) : null}
              </div>
            ) : (
              <ul className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                {filtered.map((m) => {
                  const checked = selected.has(m.id);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => toggle(m.id)}
                        className={cn(
                          "flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                          checked
                            ? "border-violet-500 bg-violet-50"
                            : "border-violet-100 bg-white hover:border-violet-200"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          className="mt-0.5 pointer-events-none"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                            <span className="font-medium leading-snug text-foreground">
                              {m.name}
                            </span>
                            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                              .{m.file_extension.toLowerCase()}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "inline-flex max-w-full rounded-full px-2 py-0.5 text-xs font-medium",
                              MATERIAL_TAG_PILL_CLASS[m.tag]
                            )}
                          >
                            {MATERIAL_TAG_LABELS[m.tag]}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {formatMaterialSize(m)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-violet-100 bg-violet-50/50 px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            disabled={n === 0 || submitting || loading}
            onClick={() => void submit()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Прикрепляем…
              </>
            ) : (
              `Прикрепить выбранные (${n})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
