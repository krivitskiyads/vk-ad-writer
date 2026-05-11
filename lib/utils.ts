import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ID для клиента: работает и по HTTP (в отличие от crypto.randomUUID()). */
export function createClientId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Только внутренние пути (защита от open redirect). */
export function safeInternalNextPath(
  next: string | null | undefined,
  fallback: string
): string {
  if (next == null || typeof next !== "string") return fallback;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  return t;
}

/** PostgREST / Postgres: insufficient_privilege — для RPC и запросов под RLS. */
export function humanizeSupabasePermissionError(error: {
  code?: string;
  message?: string;
}): string {
  if (error.code === "42501") {
    return "Недостаточно прав для этого действия";
  }
  return error.message?.trim() || "Произошла ошибка";
}
