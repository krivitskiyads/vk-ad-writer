"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  KnowledgeBaseEntry,
  KnowledgeEntryType,
} from "@/lib/types/knowledge-base";

interface TechniqueTagProps {
  entry: KnowledgeBaseEntry;
  /** true — показывает чекбокс слева; клик переключает состояние через onToggle. */
  editable?: boolean;
  /** Только для editable=true: текущее состояние "выбрано/нет". */
  selected?: boolean;
  /** Только для editable=true: вызывается с (id, isSelected) после переключения. */
  onToggle?: (id: string, selected: boolean) => void;
}

const TYPE_LABEL: Record<KnowledgeEntryType, string> = {
  trigger: "Триггер",
  formula: "Формула",
  structure: "Структура",
  principle: "Принцип",
  niche_profile: "Ниша",
  working_text_example: "Пример",
  antipattern: "Антипаттерн",
};

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

/** Краткая сводка для popover-tooltip. */
function TagSummary({ entry }: { entry: KnowledgeBaseEntry }) {
  const principle = asString(getC(entry, "principle"));
  const phrases = asStringArray(getC(entry, "example_phrases"));
  const structure = asStringArray(getC(entry, "structure"));
  const blocks = asStringArray(getC(entry, "blocks"));
  const formatForVk = asString(getC(entry, "format_for_vk"));
  const bestFor = asString(getC(entry, "best_for"));

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
          {phrases.length > 0 && (
            <p className="text-xs">
              <span className="text-muted-foreground">Пример: </span>
              {phrases[0]}
            </p>
          )}
        </>
      )}
      {entry.entry_type === "formula" && (
        <>
          {structure.length > 0 && (
            <div className="text-xs">
              <span className="text-muted-foreground">
                {structure.length <= 4 ? "Структура: " : `Из ${structure.length} этапов`}
              </span>
              {structure.length <= 4 && (
                <span>{structure.join(" → ")}</span>
              )}
            </div>
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
            <div className="text-xs">
              <span className="text-muted-foreground">
                {blocks.length <= 4 ? "Блоки: " : `Из ${blocks.length} блоков`}
              </span>
              {blocks.length <= 4 && <span>{blocks.join(" · ")}</span>}
            </div>
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

/** Полная карточка для модала. */
function TagFullCard({ entry }: { entry: KnowledgeBaseEntry }) {
  const principle = asString(getC(entry, "principle"));
  const psychology = asString(getC(entry, "psychology"));
  const howToApply = asString(getC(entry, "how_to_apply"));
  const examplePhrases = asStringArray(getC(entry, "example_phrases"));
  const structure = asStringArray(getC(entry, "structure"));
  const exampleTemplate = asString(getC(entry, "example_template"));
  const bestFor = asString(getC(entry, "best_for"));
  const blocks = asStringArray(getC(entry, "blocks"));
  const formatForVk = asString(getC(entry, "format_for_vk"));
  const exampleText = asString(getC(entry, "example_text"));
  const exampleText2 = asString(getC(entry, "example_text_2"));
  const warnings = asString(getC(entry, "warnings"));

  return (
    <div className="space-y-4 text-sm">
      {entry.short_description && (
        <p className="text-foreground leading-relaxed">{entry.short_description}</p>
      )}

      {entry.entry_type === "trigger" && (
        <>
          {principle && <Field label="Принцип" value={principle} />}
          {psychology && <Field label="Психология" value={psychology} />}
          {howToApply && <Field label="Как применять" value={howToApply} />}
          {examplePhrases.length > 0 && (
            <ListField label="Примеры фраз" items={examplePhrases} />
          )}
        </>
      )}

      {entry.entry_type === "formula" && (
        <>
          {principle && <Field label="Принцип" value={principle} />}
          {psychology && <Field label="Психология" value={psychology} />}
          {structure.length > 0 && (
            <ListField label="Структура (этапы)" items={structure} ordered />
          )}
          {howToApply && <Field label="Как применять" value={howToApply} />}
          {exampleTemplate && (
            <CodeField label="Пример шаблона" value={exampleTemplate} />
          )}
          {bestFor && <Field label="Лучше всего для" value={bestFor} />}
        </>
      )}

      {entry.entry_type === "structure" && (
        <>
          {principle && <Field label="Принцип" value={principle} />}
          {blocks.length > 0 && <ListField label="Блоки" items={blocks} ordered />}
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

export function TechniqueTag({
  entry,
  editable = false,
  selected = false,
  onToggle,
}: TechniqueTagProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  const isActive = editable && selected;

  const pillClasses = cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors select-none",
    isActive
      ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
      : "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:hover:bg-purple-900/60"
  );

  const triggerClasses = cn(
    "cursor-pointer outline-none focus-visible:underline",
    "decoration-current/40 underline-offset-2"
  );

  return (
    <>
      <span className={pillClasses}>
        {editable && (
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onToggle?.(entry.id, v === true)}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "size-3.5 shrink-0",
              isActive &&
                "border-white/70 data-checked:border-white data-checked:bg-white data-checked:text-[#7c3aed]"
            )}
            aria-label={`${selected ? "Снять выбор" : "Выбрать"}: ${entry.title}`}
          />
        )}

        <PopoverPrimitive.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverPrimitive.Trigger
            openOnHover
            delay={150}
            closeDelay={100}
            className={triggerClasses}
            aria-label={`${TYPE_LABEL[entry.entry_type]}: ${entry.title}`}
            render={<button type="button" />}
          >
            {entry.title}
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner sideOffset={8} className="z-50">
              <PopoverPrimitive.Popup
                className={cn(
                  "bg-popover text-popover-foreground ring-1 ring-foreground/10",
                  "z-50 max-w-[min(320px,calc(100vw-2rem))] rounded-xl p-3 shadow-lg outline-none",
                  "data-open:animate-in data-open:fade-in-0",
                  "data-closed:animate-out data-closed:fade-out-0"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                        {TYPE_LABEL[entry.entry_type]}
                      </div>
                      <div className="text-sm font-semibold leading-snug">
                        {entry.title}
                      </div>
                    </div>
                  </div>
                  <TagSummary entry={entry} />
                  <button
                    type="button"
                    className="text-primary text-xs font-medium hover:underline"
                    onClick={() => {
                      setPopoverOpen(false);
                      setModalOpen(true);
                    }}
                  >
                    Открыть полное описание →
                  </button>
                </div>
              </PopoverPrimitive.Popup>
            </PopoverPrimitive.Positioner>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </span>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-lg">
          <DialogHeader>
            <div className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              {TYPE_LABEL[entry.entry_type]}
            </div>
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
            <TagFullCard entry={entry} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
