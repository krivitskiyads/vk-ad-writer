"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { AnalysisSegment, ProjectAnalysis } from "@/lib/types/project-analysis";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: ProjectAnalysis;
  segmentId: string;
  onSaved?: (nextAnalysis: ProjectAnalysis) => void;
};

function toLines(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .join("\n");
}

function fromLines(v: string): string[] {
  return v
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function asPriority(v: unknown): "high" | "medium" | "low" {
  return v === "high" || v === "medium" || v === "low" ? v : "medium";
}

export function SegmentDetailsDialog({
  projectId,
  open,
  onOpenChange,
  analysis,
  segmentId,
  onSaved,
}: Props) {
  const segment = useMemo(
    () => analysis.segments.find((s) => s.id === segmentId) ?? null,
    [analysis.segments, segmentId]
  );

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<AnalysisSegment | null>(null);

  const enterEdit = () => {
    if (!segment) return;
    setDraft(JSON.parse(JSON.stringify(segment)) as AnalysisSegment);
    setMode("edit");
  };

  const cancelEdit = () => {
    setDraft(null);
    setMode("view");
  };

  const close = () => {
    cancelEdit();
    onOpenChange(false);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const nextSegments = analysis.segments.map((s) => (s.id === segmentId ? draft : s));
      const nextAnalysis: ProjectAnalysis = { ...analysis, segments: nextSegments };

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: nextAnalysis }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить сегмент");
      }

      toast.success("Сегмент сохранён");
      onSaved?.(nextAnalysis);
      cancelEdit();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (!segment) return null;
  const s = mode === "edit" ? (draft as AnalysisSegment) : segment;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white pb-2">
          <DialogTitle>{mode === "edit" ? "Редактирование сегмента" : "Сегмент"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Название</div>
            {mode === "edit" ? (
              <Input
                value={s.name}
                onChange={(e) => setDraft((p) => (p ? { ...p, name: e.target.value } : p))}
                className="mt-1"
              />
            ) : (
              <div className="text-sm text-gray-900 mt-1">{s.name}</div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Описание</div>
            {mode === "edit" ? (
              <Textarea
                value={s.description ?? ""}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, description: e.target.value } : p))
                }
                className="mt-1 min-h-[88px]"
              />
            ) : (
              <div className="text-sm text-gray-900 mt-1">{s.description ?? "—"}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Возраст от</div>
              {mode === "edit" ? (
                <Input
                  inputMode="numeric"
                  value={s.demographics?.age_from ?? ""}
                  onChange={(e) =>
                    setDraft((p) =>
                      p
                        ? {
                            ...p,
                            demographics: {
                              ...(p.demographics ?? {}),
                              age_from: e.target.value ? Number(e.target.value) : undefined,
                            },
                          }
                        : p
                    )
                  }
                  className="mt-1"
                />
              ) : (
                <div className="text-sm text-gray-900 mt-1">
                  {s.demographics?.age_from ?? "—"}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Возраст до</div>
              {mode === "edit" ? (
                <Input
                  inputMode="numeric"
                  value={s.demographics?.age_to ?? ""}
                  onChange={(e) =>
                    setDraft((p) =>
                      p
                        ? {
                            ...p,
                            demographics: {
                              ...(p.demographics ?? {}),
                              age_to: e.target.value ? Number(e.target.value) : undefined,
                            },
                          }
                        : p
                    )
                  }
                  className="mt-1"
                />
              ) : (
                <div className="text-sm text-gray-900 mt-1">{s.demographics?.age_to ?? "—"}</div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Пол</div>
              {mode === "edit" ? (
                <Input
                  value={s.demographics?.gender ?? ""}
                  onChange={(e) =>
                    setDraft((p) =>
                      p
                        ? {
                            ...p,
                            demographics: { ...(p.demographics ?? {}), gender: e.target.value },
                          }
                        : p
                    )
                  }
                  className="mt-1"
                />
              ) : (
                <div className="text-sm text-gray-900 mt-1">{s.demographics?.gender ?? "—"}</div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Доход</div>
              {mode === "edit" ? (
                <Input
                  value={s.demographics?.income ?? ""}
                  onChange={(e) =>
                    setDraft((p) =>
                      p
                        ? {
                            ...p,
                            demographics: { ...(p.demographics ?? {}), income: e.target.value },
                          }
                        : p
                    )
                  }
                  className="mt-1"
                />
              ) : (
                <div className="text-sm text-gray-900 mt-1">{s.demographics?.income ?? "—"}</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Боли</div>
            {mode === "edit" ? (
              <Textarea
                value={toLines(s.pain_points)}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, pain_points: fromLines(e.target.value) } : p))
                }
                className="mt-1 min-h-[96px]"
              />
            ) : (
              <div className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                {toLines(s.pain_points) || "—"}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Желания</div>
            {mode === "edit" ? (
              <Textarea
                value={toLines(s.desires)}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, desires: fromLines(e.target.value) } : p))
                }
                className="mt-1 min-h-[96px]"
              />
            ) : (
              <div className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                {toLines(s.desires) || "—"}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Возражения</div>
            {mode === "edit" ? (
              <Textarea
                value={toLines(s.objections)}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, objections: fromLines(e.target.value) } : p))
                }
                className="mt-1 min-h-[96px]"
              />
            ) : (
              <div className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                {toLines(s.objections) || "—"}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Триггеры</div>
            {mode === "edit" ? (
              <Textarea
                value={toLines(s.triggers)}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, triggers: fromLines(e.target.value) } : p))
                }
                className="mt-1 min-h-[96px]"
              />
            ) : (
              <div className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                {toLines(s.triggers) || "—"}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Приоритет</div>
            {mode === "edit" ? (
              <Input
                value={asPriority(s.priority)}
                onChange={(e) =>
                  setDraft((p) =>
                    p
                      ? { ...p, priority: asPriority(e.target.value) }
                      : p
                  )
                }
                className="mt-1"
              />
            ) : (
              <div className="text-sm text-gray-900 mt-1">{asPriority(s.priority)}</div>
            )}
          </div>
        </div>

        <DialogFooter>
          {mode === "edit" ? (
            <>
              <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                Отмена
              </Button>
              <Button type="button" onClick={() => void save()} disabled={saving}>
                Сохранить
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={close}>
                Закрыть
              </Button>
              <Button type="button" onClick={enterEdit}>
                Редактировать
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

