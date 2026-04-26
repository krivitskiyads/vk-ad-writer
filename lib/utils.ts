import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ID для клиента: работает и по HTTP (в отличие от crypto.randomUUID()). */
export function createClientId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
