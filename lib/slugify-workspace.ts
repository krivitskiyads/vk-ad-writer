const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterateChar(ch: string): string {
  const lower = ch.toLowerCase();
  const mapped = CYRILLIC_MAP[lower];
  if (mapped !== undefined) return mapped;
  if (/[a-z0-9]/.test(lower)) return lower;
  return "";
}

/** URL-slug for workspace: translit + lowercase + hyphens. */
export function slugifyWorkspaceName(name: string): string {
  const raw = name.trim().toLowerCase();
  let out = "";
  for (const ch of raw) {
    if (/[а-яё]/.test(ch)) {
      out += transliterateChar(ch);
      continue;
    }
    if (/[a-z0-9]/.test(ch)) {
      out += ch;
      continue;
    }
    out += "-";
  }
  out = out
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "workspace";
}
