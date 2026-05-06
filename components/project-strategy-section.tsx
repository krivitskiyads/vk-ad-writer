"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { TechniquesEditor } from "@/components/techniques-editor";
import type { SelectedTechniques } from "@/lib/types/knowledge-base";

type Props = {
  projectId: string;
  initialSelected: SelectedTechniques | null;
};

const EMPTY: SelectedTechniques = {
  triggers: [],
  formulas: [],
  structures: [],
  reasoning: "",
};

const SAVE_DEBOUNCE_MS = 600;

export function ProjectStrategySection({ projectId, initialSelected }: Props) {
  const [value, setValue] = useState<SelectedTechniques>(
    initialSelected ?? EMPTY
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);
  const initialValueRef = useRef<string>(JSON.stringify(initialSelected ?? EMPTY));

  useEffect(() => {
    initialValueRef.current = JSON.stringify(initialSelected ?? EMPTY);
    setValue(initialSelected ?? EMPTY);
  }, [initialSelected]);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const currentJson = JSON.stringify(value);
      if (currentJson === initialValueRef.current) return;
      void persist(value);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const persist = async (next: SelectedTechniques) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_techniques: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      initialValueRef.current = JSON.stringify(next);
      setSavedAt(Date.now());
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка сохранения";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Эти техники применяются ко всем новым кампаниям проекта по умолчанию. В
          каждой кампании их можно переопределить.
        </p>
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
      <TechniquesEditor
        initialSelected={initialSelected}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}
