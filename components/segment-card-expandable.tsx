"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GENDER_OPTIONS,
  INCOME_OPTIONS,
  genderLabel,
  incomeLabel,
  normalizeGender,
  normalizeIncome,
  type Gender,
  type Income,
} from "@/lib/segment-options";
import type { AnalysisSegment, ProjectAnalysis } from "@/lib/types/project-analysis";
import { cn } from "@/lib/utils";

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

function segmentPreview(s: AnalysisSegment): string {
  if (s.description?.trim()) return s.description.trim();
  const pains = Array.isArray(s.pain_points)
    ? s.pain_points.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0
      )
    : [];
  if (pains.length) return pains.join(". ");
  return "Нет описания — нажми, чтобы развернуть";
}

type Props = {
  projectId: string;
  analysis: ProjectAnalysis;
  segment: AnalysisSegment & { id: string };
  onSaved: (next: ProjectAnalysis) => void;
};

export function SegmentCardExpandable({
  projectId,
  analysis,
  segment,
  onSaved,
}: Props) {
  const segmentId = segment.id;
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<AnalysisSegment | null>(null);
  const [saving, setSaving] = useState(false);

  const enterEdit = () => {
    setDraft(JSON.parse(JSON.stringify(segment)) as AnalysisSegment);
    setMode("edit");
  };

  const cancelEdit = () => {
    setDraft(null);
    setMode("view");
  };

  const collapse = () => {
    if (mode === "edit") cancelEdit();
    setExpanded(false);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const nextSegments = analysis.segments.map((s) =>
        s.id === segmentId ? draft : s
      );
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
      onSaved(nextAnalysis);
      cancelEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const s = mode === "edit" && draft ? draft : segment;
  const d = s.demographics ?? {};

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 p-4 text-left transition-colors hover:bg-muted/20",
          !expanded && "active:bg-muted/30"
        )}
        onClick={() => {
          if (!expanded) setExpanded(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!expanded) setExpanded(true);
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground text-base font-semibold leading-snug">
            {mode === "edit" && draft ? draft.name : segment.name}
          </h3>
          {!expanded ? (
            <p className="text-muted-foreground mt-1 line-clamp-3 text-sm">
              {segmentPreview(segment)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted shrink-0 rounded-md p-1.5"
          aria-label={expanded ? "Свернуть" : "Развернуть"}
          onClick={(e) => {
            e.stopPropagation();
            if (expanded) collapse();
            else setExpanded(true);
          }}
        >
          {expanded ? (
            <ChevronUp className="size-5" aria-hidden />
          ) : (
            <ChevronDown className="size-5" aria-hidden />
          )}
        </button>
      </div>

      {expanded ? (
        <div className="border-border space-y-4 border-t px-4 pb-4 pt-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {mode === "view" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2 border-violet-500 text-violet-700 hover:bg-violet-50"
                onClick={enterEdit}
              >
                <Pencil className="size-3.5" aria-hidden />
                Редактировать
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                  onClick={() => void save()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : null}
                  Сохранить
                </Button>
              </>
            )}
          </div>

          {mode === "view" ? (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Описание
                </div>
                <p className="text-foreground mt-1 whitespace-pre-wrap">
                  {s.description?.trim() || "—"}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Возраст от
                  </div>
                  <p className="mt-1">{d.age_from ?? "—"}</p>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Возраст до
                  </div>
                  <p className="mt-1">{d.age_to ?? "—"}</p>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Пол
                  </div>
                  <p className="mt-1">{genderLabel(d.gender)}</p>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Доход
                  </div>
                  <p className="mt-1">{incomeLabel(d.income)}</p>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Боли
                </div>
                {Array.isArray(s.pain_points) && s.pain_points.length > 0 ? (
                  <ul className="text-foreground mt-2 list-inside list-disc space-y-1">
                    {s.pain_points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground mt-1">—</p>
                )}
              </div>
            </div>
          ) : (
            draft && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`seg-name-${segmentId}`}>Название</Label>
                  <Input
                    id={`seg-name-${segmentId}`}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((p) => (p ? { ...p, name: e.target.value } : p))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`seg-desc-${segmentId}`}>Описание</Label>
                  <Textarea
                    id={`seg-desc-${segmentId}`}
                    value={draft.description ?? ""}
                    onChange={(e) =>
                      setDraft((p) =>
                        p ? { ...p, description: e.target.value } : p
                      )
                    }
                    className="mt-1 min-h-[88px]"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`seg-age-from-${segmentId}`}>Возраст от</Label>
                    <Input
                      id={`seg-age-from-${segmentId}`}
                      inputMode="numeric"
                      value={draft.demographics?.age_from ?? ""}
                      onChange={(e) =>
                        setDraft((p) =>
                          p
                            ? {
                                ...p,
                                demographics: {
                                  ...(p.demographics ?? {}),
                                  age_from: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                },
                              }
                            : p
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`seg-age-to-${segmentId}`}>Возраст до</Label>
                    <Input
                      id={`seg-age-to-${segmentId}`}
                      inputMode="numeric"
                      value={draft.demographics?.age_to ?? ""}
                      onChange={(e) =>
                        setDraft((p) =>
                          p
                            ? {
                                ...p,
                                demographics: {
                                  ...(p.demographics ?? {}),
                                  age_to: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                },
                              }
                            : p
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Пол</Label>
                  <Select
                    value={normalizeGender(draft.demographics?.gender)}
                    onValueChange={(v) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              demographics: {
                                ...(p.demographics ?? {}),
                                gender: v as Gender,
                              },
                            }
                          : p
                      )
                    }
                  >
                    <SelectTrigger className="mt-1 w-full sm:max-w-md">
                      <SelectValue>
                        {genderLabel(draft.demographics?.gender)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Доход</Label>
                  <Select
                    value={normalizeIncome(draft.demographics?.income)}
                    onValueChange={(v) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              demographics: {
                                ...(p.demographics ?? {}),
                                income: v as Income,
                              },
                            }
                          : p
                      )
                    }
                  >
                    <SelectTrigger className="mt-1 w-full sm:max-w-md">
                      <SelectValue>
                        {incomeLabel(draft.demographics?.income)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`seg-pains-${segmentId}`}>
                    Боли (по одной на строку)
                  </Label>
                  <Textarea
                    id={`seg-pains-${segmentId}`}
                    value={toLines(draft.pain_points)}
                    onChange={(e) =>
                      setDraft((p) =>
                        p ? { ...p, pain_points: fromLines(e.target.value) } : p
                      )
                    }
                    className="mt-1 min-h-[96px]"
                  />
                </div>
              </div>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
