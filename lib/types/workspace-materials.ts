export const MATERIAL_TAGS = [
  "brief",
  "product",
  "reviews",
  "cases",
  "audience",
  "competitors",
  "ready_texts",
  "messages",
  "posts",
  "other",
] as const;

export type MaterialTag = (typeof MATERIAL_TAGS)[number];

export const MATERIAL_TAG_LABELS: Record<MaterialTag, string> = {
  brief: "Бриф",
  product: "О продукте",
  reviews: "Отзывы",
  cases: "Кейсы",
  audience: "Аудитория",
  competitors: "Конкуренты",
  ready_texts: "Готовые тексты",
  messages: "Сообщения",
  posts: "Посты",
  other: "Прочее",
};

/** Светлые pill-стили в фиолетовой гамме проекта */
export const MATERIAL_TAG_PILL_CLASS: Record<MaterialTag, string> = {
  brief: "border border-violet-200 bg-violet-50 text-violet-800",
  product: "border border-indigo-200 bg-indigo-50 text-indigo-800",
  reviews: "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  cases: "border border-purple-200 bg-purple-50 text-purple-800",
  audience: "border border-violet-200 bg-violet-100/80 text-violet-900",
  competitors: "border border-rose-200 bg-rose-50 text-rose-800",
  ready_texts: "border border-amber-200 bg-amber-50 text-amber-900",
  messages: "border border-sky-200 bg-sky-50 text-sky-900",
  posts: "border border-teal-200 bg-teal-50 text-teal-900",
  other: "border border-neutral-200 bg-neutral-100 text-neutral-700",
};

export interface WorkspaceMaterial {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  tag: MaterialTag;
  content_text: string;
  file_extension: string;
  source_filename: string;
  content_tokens: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialAuthor {
  id: string;
  email: string;
}

export interface WorkspaceMaterialWithAuthor extends WorkspaceMaterial {
  author: MaterialAuthor | null;
}

/** Для списков без тяжёлого поля `content_text` (например выбор из библиотеки). */
export type WorkspaceMaterialSummary = Omit<
  WorkspaceMaterialWithAuthor,
  "content_text"
>;

/** Маппинг устаревших/неизвестных значений tag из БД (совместимость при расширении enum). */
export function normalizeMaterialTag(raw: unknown): MaterialTag {
  if (
    typeof raw === "string" &&
    (MATERIAL_TAGS as readonly string[]).includes(raw)
  ) {
    return raw as MaterialTag;
  }
  return "other";
}
