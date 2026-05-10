export const GENDER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "male", label: "Мужчины" },
  { value: "female", label: "Женщины" },
  { value: "mostly_male", label: "Преимущественно мужчины" },
  { value: "mostly_female", label: "Преимущественно женщины" },
] as const;

export const INCOME_OPTIONS = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "above_medium", label: "Выше среднего" },
  { value: "high", label: "Высокий" },
  { value: "premium", label: "Премиум" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];
export type Income = (typeof INCOME_OPTIONS)[number]["value"];

const GENDER_SET = new Set<string>(GENDER_OPTIONS.map((o) => o.value));
const INCOME_SET = new Set<string>(INCOME_OPTIONS.map((o) => o.value));

export function normalizeGender(raw: string | null | undefined): Gender {
  if (raw == null || String(raw).trim() === "") return "all";
  const t = String(raw).trim().toLowerCase();

  if (GENDER_SET.has(t)) return t as Gender;

  if (t === "all" || t === "все" || t === "any") return "all";
  if (t === "male" || t === "мужчины" || t === "м" || t === "m") return "male";
  if (t === "female" || t === "женщины" || t === "ж" || t === "f") return "female";

  if (t.includes("преимущественно")) {
    if (t.includes("муж")) return "mostly_male";
    if (t.includes("жен")) return "mostly_female";
  }

  if (t.includes("муж") && !t.includes("жен")) return "mostly_male";
  if (t.includes("жен") && !t.includes("муж")) return "mostly_female";

  return "all";
}

export function normalizeIncome(raw: string | null | undefined): Income {
  if (raw == null || String(raw).trim() === "") return "medium";
  const t = String(raw).trim().toLowerCase();

  if (INCOME_SET.has(t)) return t as Income;

  if (t === "low" || t === "низкий" || (t.includes("низк") && t.includes("доход")))
    return "low";
  if (t === "medium" || t === "средний" || t === "средн") return "medium";
  if (
    t === "above_medium" ||
    t.includes("выше средн") ||
    t.includes("выше среднего")
  )
    return "above_medium";
  if (t === "high" || t === "высокий" || t === "высок") return "high";
  if (t === "premium" || t === "премиум" || t.includes("премиум")) return "premium";

  return "medium";
}

export function genderLabel(value: string | null | undefined): string {
  const v = normalizeGender(value);
  return GENDER_OPTIONS.find((o) => o.value === v)?.label ?? "Все";
}

export function incomeLabel(value: string | null | undefined): string {
  const v = normalizeIncome(value);
  return INCOME_OPTIONS.find((o) => o.value === v)?.label ?? "Средний";
}
