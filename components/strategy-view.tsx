"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TechniqueTag } from "@/components/technique-tag";
import type {
  KnowledgeBaseEntry,
  SelectedTechniques,
} from "@/lib/types/knowledge-base";

interface StrategyViewProps {
  selected: SelectedTechniques | null | undefined;
}

const REASONING_PREVIEW_CHARS = 200;

export function StrategyView({ selected }: StrategyViewProps) {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  const allIds = useMemo(() => {
    if (!selected) return [] as string[];
    return [
      ...(Array.isArray(selected.triggers) ? selected.triggers : []),
      ...(Array.isArray(selected.formulas) ? selected.formulas : []),
      ...(Array.isArray(selected.structures) ? selected.structures : []),
    ];
  }, [selected]);

  useEffect(() => {
    if (!selected || allIds.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/knowledge/by-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: allIds }),
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const arr =
          typeof data === "object" &&
          data !== null &&
          "entries" in data &&
          Array.isArray((data as { entries: unknown }).entries)
            ? ((data as { entries: KnowledgeBaseEntry[] }).entries)
            : [];
        setEntries(arr);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[strategy] load entries failed", e);
        setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, allIds]);

  if (!selected) return null;

  const triggers = entries.filter((e) => e.entry_type === "trigger");
  const formulas = entries.filter((e) => e.entry_type === "formula");
  const structures = entries.filter((e) => e.entry_type === "structure");

  const reasoning = (selected.reasoning ?? "").trim();
  const reasoningTooLong = reasoning.length > REASONING_PREVIEW_CHARS;
  const reasoningPreview =
    reasoningTooLong && !reasoningExpanded
      ? `${reasoning.slice(0, REASONING_PREVIEW_CHARS).trimEnd()}…`
      : reasoning;

  const hasAnyTechnique =
    triggers.length + formulas.length + structures.length > 0;
  const hasAnyContent = hasAnyTechnique || reasoning.length > 0;

  if (!loading && !hasAnyContent) return null;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Стратегия копирайтинга</CardTitle>
        <CardDescription>
          Техники, которые AI выбрал под этот проект из базы знаний
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Загружаем техники…
          </div>
        )}

        {!loading && reasoning && (
          <div className="bg-muted/40 border-border rounded-lg border p-3">
            <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Обоснование AI
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {reasoningPreview}
            </p>
            {reasoningTooLong && (
              <button
                type="button"
                onClick={() => setReasoningExpanded((v) => !v)}
                className="text-primary mt-1 text-xs font-medium hover:underline"
              >
                {reasoningExpanded ? "Свернуть" : "Показать полностью"}
              </button>
            )}
          </div>
        )}

        {!loading && formulas.length > 0 && (
          <Section title="Формула">
            {formulas.map((entry) => (
              <TechniqueTag key={entry.id} entry={entry} />
            ))}
          </Section>
        )}

        {!loading && triggers.length > 0 && (
          <Section title="Триггеры">
            {triggers.map((entry) => (
              <TechniqueTag key={entry.id} entry={entry} />
            ))}
          </Section>
        )}

        {!loading && structures.length > 0 && (
          <Section title="Структуры">
            {structures.map((entry) => (
              <TechniqueTag key={entry.id} entry={entry} />
            ))}
          </Section>
        )}

        {!loading && !hasAnyTechnique && reasoning.length > 0 && (
          <p className="text-muted-foreground text-xs">
            AI не вернул конкретных техник — будет использован базовый промпт копирайтера.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
