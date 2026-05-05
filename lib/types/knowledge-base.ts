export type KnowledgeEntryType =
  | "trigger"
  | "structure"
  | "formula"
  | "principle"
  | "niche_profile"
  | "working_text_example"
  | "antipattern";

export interface KnowledgeBaseEntry {
  id: string;
  entry_type: KnowledgeEntryType;
  title: string;
  short_description: string | null;
  content: Record<string, unknown>;
  niche: string | null;
  niche_category: string | null;
  applicable_to: string[];
  tags: string[];
  priority: number;
  is_active: boolean;
  source: string | null;
}

/** Облегчённая версия для меню аналитика (без поля content). */
export interface KnowledgeBaseSummary {
  id: string;
  entry_type: KnowledgeEntryType;
  title: string;
  short_description: string | null;
  applicable_to: string[];
  tags: string[];
  priority: number;
}

/** Выбор техник аналитиком. */
export interface SelectedTechniques {
  triggers: string[];
  formulas: string[];
  structures: string[];
  reasoning: string;
}
