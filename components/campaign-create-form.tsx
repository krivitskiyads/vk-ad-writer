"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectAnalysis } from "@/lib/types/project-analysis";

type Props = {
  projectId: string;
  analysis: ProjectAnalysis;
};

export function CampaignCreateForm({ projectId, analysis }: Props) {
  const router = useRouter();
  const segments = analysis.segments ?? [];
  const pairs = useMemo(
    () =>
      segments.map((s, i) => ({
        seg: s,
        id:
          typeof s.id === "string" && s.id.trim()
            ? s.id.trim()
            : `segment-${i}`,
      })),
    [segments]
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => {
    const init = new Set<string>();
    for (const p of pairs) init.add(p.id);
    return init;
  });
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit =
    name.trim().length > 0 && selected.size > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          selectedSegmentIds: Array.from(selected),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Не удалось создать"
        );
      }
      const campaign = data.campaign as { id: string };
      router.push(
        `/projects/${projectId}/campaigns/${campaign.id}/upload`
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="camp-name">Имя кампании</Label>
        <Input
          id="camp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Распродажа летнего курса"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="camp-desc">Описание / бриф</Label>
        <Textarea
          id="camp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Краткое описание этой задачи: что продвигаем, что важно учесть"
          rows={4}
        />
      </div>

      <div className="space-y-3">
        <Label>Под какие сегменты будем готовить тексты?</Label>
        <ul className="space-y-2 rounded-lg border border-border bg-card p-3">
          {pairs.map(({ seg, id }) => {
            return (
              <li key={id} className="flex items-start gap-3">
                <Checkbox
                  id={`seg-${id}`}
                  checked={selected.has(id)}
                  onCheckedChange={() => toggle(id)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`seg-${id}`}
                  className="cursor-pointer text-sm leading-snug"
                >
                  <span className="font-medium">{seg.name}</span>
                  {seg.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {seg.description}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          Если выбраны несколько — тексты будут учитывать всех. Можно сузить под
          конкретный сегмент.
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        disabled={!canSubmit}
        className="w-full bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
        onClick={() => void onSubmit()}
      >
        {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Создать кампанию и продолжить
      </Button>
    </div>
  );
}
