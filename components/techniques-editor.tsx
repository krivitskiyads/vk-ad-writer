"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Info, Loader2, RotateCcw } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  KnowledgeBaseEntry,
  KnowledgeEntryType,
  SelectedTechniques,
} from "@/lib/types/knowledge-base";
import { cn } from "@/lib/utils";

interface TechniquesEditorProps {
  /** Изначальный выбор AI (приходит из проекта). Используется для кнопки "Вернуть выбор AI". */
  initialSelected: SelectedTechniques | null;
  /** Текущий выбор юзера. */
  value: SelectedTechniques;
  onChange: (next: SelectedTechniques) => void;
}

const REASONING_PREVIEW_CHARS = 200;

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function getC(entry: KnowledgeBaseEntry, key: string): unknown {
  return (entry.content ?? {})[key];
}

function TechniqueSummary({ entry }: { entry: KnowledgeBaseEntry }) {
  const principle = asString(getC(entry, "principle"));
  const examplePhrases = asStringArray(getC(entry, "example_phrases"));
  const structure = asStringArray(getC(entry, "structure"));
  const blocks = asStringArray(getC(entry, "blocks"));
  const bestFor = asString(getC(entry, "best_for"));
  const formatForVk = asString(getC(entry, "format_for_vk"));

  return (
    <div className="space-y-2">
      {entry.short_description && (
        <p className="text-foreground text-sm leading-relaxed">
          {entry.short_description}
        </p>
      )}
      {entry.entry_type === "trigger" && (
        <>
          {principle && (
            <p className="text-xs">
              <span className="text-muted-foreground">Принцип: </span>
              {principle}
            </p>
          )}
          {examplePhrases[0] && (
            <p className="text-xs">
              <span className="text-muted-foreground">Пример: </span>
              {examplePhrases[0]}
            </p>
          )}
        </>
      )}
      {entry.entry_type === "formula" && (
        <>
          {structure.length > 0 && (
            <p className="text-xs">
              <span className="text-muted-foreground">
                {structure.length <= 4 ? "Структура: " : `Из ${structure.length} этапов`}
              </span>
              {structure.length <= 4 ? structure.join(" → ") : null}
            </p>
          )}
          {bestFor && (
            <p className="text-xs">
              <span className="text-muted-foreground">Лучше всего для: </span>
              {bestFor}
            </p>
          )}
        </>
      )}
      {entry.entry_type === "structure" && (
        <>
          {blocks.length > 0 && (
            <p className="text-xs">
              <span className="text-muted-foreground">
                {blocks.length <= 4 ? "Блоки: " : `Из ${blocks.length} блоков`}
              </span>
              {blocks.length <= 4 ? blocks.join(" · ") : null}
            </p>
          )}
          {formatForVk && (
            <p className="text-xs">
              <span className="text-muted-foreground">Формат: </span>
              {formatForVk}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TechniqueFullCard({ entry }: { entry: KnowledgeBaseEntry }) {
  const principle = asString(getC(entry, "principle"));
  const psychology = asString(getC(entry, "psychology"));
  const howToApply = asString(getC(entry, "how_to_apply"));
  const warnings = asString(getC(entry, "warnings"));

  const examplePhrases = asStringArray(getC(entry, "example_phrases"));
  const structure = asStringArray(getC(entry, "structure"));
  const exampleTemplate = asString(getC(entry, "example_template"));
  const bestFor = asString(getC(entry, "best_for"));

  const blocks = asStringArray(getC(entry, "blocks"));
  const formatForVk = asString(getC(entry, "format_for_vk"));
  const exampleText = asString(getC(entry, "example_text"));
  const exampleText2 = asString(getC(entry, "example_text_2"));

  return (
    <div className="space-y-4 text-sm">
      {entry.short_description && (
        <p className="text-foreground leading-relaxed">{entry.short_description}</p>
      )}

      {principle && <Field label="Принцип" value={principle} />}
      {psychology && <Field label="Психология" value={psychology} />}
      {howToApply && <Field label="Как применять" value={howToApply} />}

      {entry.entry_type === "trigger" && examplePhrases.length > 0 && (
        <ListField label="Примеры фраз" items={examplePhrases} />
      )}

      {entry.entry_type === "formula" && (
        <>
          {structure.length > 0 && (
            <ListField label="Структура (этапы)" items={structure} ordered />
          )}
          {exampleTemplate && (
            <CodeField label="Пример шаблона" value={exampleTemplate} />
          )}
          {bestFor && <Field label="Лучше всего для" value={bestFor} />}
        </>
      )}

      {entry.entry_type === "structure" && (
        <>
          {blocks.length > 0 && (
            <ListField label="Блоки" items={blocks} ordered />
          )}
          {formatForVk && <Field label="Формат для ВК" value={formatForVk} />}
          {exampleText && <CodeField label="Пример текста" value={exampleText} />}
          {exampleText2 && (
            <CodeField label="Альтернативный пример" value={exampleText2} />
          )}
          {bestFor && <Field label="Лучше всего для" value={bestFor} />}
        </>
      )}

      {warnings && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <span className="font-medium">⚠ Осторожно: </span>
          {warnings}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wide">
        {label}
      </div>
      <p className="leading-relaxed">{value}</p>
    </div>
  );
}

function ListField({
  label,
  items,
  ordered,
}: {
  label: string;
  items: string[];
  ordered?: boolean;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
        {label}
      </div>
      {ordered ? (
        <ol className="list-inside list-decimal space-y-1">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-inside list-disc space-y-1">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CodeField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
        {label}
      </div>
      <pre className="bg-muted/50 border-border max-h-64 overflow-auto whitespace-pre-wrap rounded-md border p-3 font-mono text-xs leading-relaxed">
        {value}
      </pre>
    </div>
  );
}

function TechniqueCard({
  entry,
  selected,
  onToggle,
}: {
  entry: KnowledgeBaseEntry;
  selected: boolean;
  onToggle: (nextSelected: boolean) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const pillClasses = cn(
    "group flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
    "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    selected
      ? "bg-[#7c3aed] text-white border-[#7c3aed]/40 hover:bg-[#6d28d9]"
      : "border-border bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:hover:bg-purple-900/60"
  );

  const checkboxClasses = cn(
    "mt-0.5 shrink-0 pointer-events-none",
    selected &&
      "border-white/70 data-checked:border-white data-checked:bg-white data-checked:text-[#7c3aed]"
  );

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle(!selected);
    }
  };

  return (
    <>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          render={
            <div
              role="button"
              tabIndex={0}
              className={pillClasses}
              onClick={() => onToggle(!selected)}
              onKeyDown={onKeyDown}
              aria-pressed={selected}
            />
          }
          closeOnClick
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Checkbox checked={selected} className={checkboxClasses} />
            <div className="min-w-0">
              <div className={cn("text-xs font-semibold", selected && "text-white/90")}>
                {entry.title}
              </div>
              {entry.short_description && (
                <div
                  className={cn(
                    "mt-0.5 text-xs leading-relaxed",
                    selected ? "text-white/85" : "text-purple-800/80"
                  )}
                >
                  {entry.short_description}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className={cn(
              "shrink-0 rounded-md p-1 transition-colors",
              selected
                ? "text-white/90 hover:bg-white/10"
                : "text-purple-800 hover:bg-purple-300/40 dark:text-purple-200 dark:hover:bg-purple-900/60"
            )}
            aria-label={`Подробнее: ${entry.title}`}
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(true);
            }}
          >
            <Info className="size-4" aria-hidden />
          </button>
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner sideOffset={8} className="z-50">
            <TooltipPrimitive.Popup
              className={cn(
                "bg-popover text-popover-foreground ring-1 ring-foreground/10",
                "z-50 max-w-[min(340px,calc(100vw-2rem))] rounded-xl p-3 shadow-lg outline-none"
              )}
            >
              <div className="space-y-2">
                <div className="text-sm font-semibold leading-snug">
                  {entry.title}
                </div>
                <TechniqueSummary entry={entry} />
                <button
                  type="button"
                  className="text-primary text-xs font-medium hover:underline"
                  onClick={() => setModalOpen(true)}
                >
                  Открыть полное описание →
                </button>
              </div>
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {entry.title}
            </DialogTitle>
            {entry.short_description && (
              <DialogDescription className="sr-only">
                {entry.short_description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <TechniqueFullCard entry={entry} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TechniquesEditor({
  initialSelected,
  value,
  onChange,
}: TechniquesEditorProps) {
  const [allEntries, setAllEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/knowledge")
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
        setAllEntries(arr);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[techniques-editor] load failed", e);
        setAllEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { triggers, formulas, structures } = useMemo(() => {
    return {
      triggers: allEntries.filter((e) => e.entry_type === "trigger"),
      formulas: allEntries.filter((e) => e.entry_type === "formula"),
      structures: allEntries.filter((e) => e.entry_type === "structure"),
    };
  }, [allEntries]);

  const handleToggle = (
    entryType: KnowledgeEntryType,
    id: string,
    isSelected: boolean
  ) => {
    const key =
      entryType === "trigger"
        ? "triggers"
        : entryType === "formula"
          ? "formulas"
          : entryType === "structure"
            ? "structures"
            : null;
    if (!key) return;
    const current = value[key] ?? [];
    const next = isSelected
      ? current.includes(id)
        ? current
        : [...current, id]
      : current.filter((x) => x !== id);
    onChange({ ...value, [key]: next });
  };

  const handleResetToAi = () => {
    if (!initialSelected) return;
    onChange({
      triggers: [...initialSelected.triggers],
      formulas: [...initialSelected.formulas],
      structures: [...initialSelected.structures],
      reasoning: value.reasoning,
    });
  };

  const reasoning = (initialSelected?.reasoning ?? "").trim();
  const reasoningTooLong = reasoning.length > REASONING_PREVIEW_CHARS;
  const reasoningPreview =
    reasoningTooLong && !reasoningExpanded
      ? `${reasoning.slice(0, REASONING_PREVIEW_CHARS).trimEnd()}…`
      : reasoning;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Техники копирайтинга</CardTitle>
          <CardDescription>
            Выбор AI можно скорректировать вручную. Влияет на стиль и структуру
            текстов.
          </CardDescription>
        </div>
        {initialSelected && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleResetToAi}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Вернуть выбор AI
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Загружаем техники…
          </div>
        ) : (
          <>
            {reasoning && (
              <div className="bg-muted/40 border-border rounded-lg border">
                <button
                  type="button"
                  onClick={() => setReasoningOpen((v) => !v)}
                  className="hover:bg-muted/60 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                  aria-expanded={reasoningOpen}
                >
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    Обоснование AI
                  </span>
                  {reasoningOpen ? (
                    <ChevronUp className="size-4" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden />
                  )}
                </button>
                {reasoningOpen && (
                  <div className="border-border border-t px-3 py-3">
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
              </div>
            )}

            <Section
              title="Формула"
              counter={`выбрано ${value.formulas.length} из ${formulas.length}`}
              entries={formulas}
              selectedIds={value.formulas}
              onToggle={handleToggle}
            />
            <Section
              title="Триггеры"
              counter={`выбрано ${value.triggers.length} из ${triggers.length}`}
              entries={triggers}
              selectedIds={value.triggers}
              onToggle={handleToggle}
            />
            <Section
              title="Структуры"
              counter={`выбрано ${value.structures.length} из ${structures.length}`}
              entries={structures}
              selectedIds={value.structures}
              onToggle={handleToggle}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  counter,
  entries,
  selectedIds,
  onToggle,
}: {
  title: string;
  counter: string;
  entries: KnowledgeBaseEntry[];
  selectedIds: string[];
  onToggle: (entryType: KnowledgeEntryType, id: string, sel: boolean) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-muted-foreground text-xs">({counter})</span>
      </div>
      <div className="grid gap-2">
        {entries.map((entry) => (
          <TechniqueCard
            key={entry.id}
            entry={entry}
            selected={selectedIds.includes(entry.id)}
            onToggle={(sel) => onToggle(entry.entry_type, entry.id, sel)}
          />
        ))}
      </div>
    </div>
  );
}
