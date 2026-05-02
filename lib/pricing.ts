/**
 * Цены Claude API (USD за 1 миллион токенов).
 * Актуально на май 2026 — перепроверять раз в квартал.
 *
 * Источник: https://www.anthropic.com/pricing#anthropic-api
 */

/** Множители для prompt caching (применяются к input price). */
export const CACHE_MULTIPLIER = {
  /** Запись в кэш дороже обычного input. */
  creation: 1.25,
  /** Чтение из кэша на 90% дешевле обычного input. */
  read: 0.1,
} as const;

/** Цены за 1 миллион токенов (USD). */
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number }
> = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-6": { input: 5.0, output: 25.0 },
  "claude-opus-4-7": { input: 5.0, output: 25.0 },
};

const PER_MILLION = 1_000_000;

export type CalculateCostParams = {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
};

/**
 * Расчёт стоимости одного вызова Claude API в USD.
 * Возвращает полную точность (для записи в numeric поле БД, не округляем).
 *
 * cache_read и cache_creation токены — это ВХОДНЫЕ токены, биллятся отдельно
 * по input price с соответствующими множителями. См. CACHE_MULTIPLIER.
 *
 * @throws Error если модель не найдена в MODEL_PRICING.
 */
export function calculateCostUsd(params: CalculateCostParams): number {
  const pricing = MODEL_PRICING[params.model];
  if (!pricing) {
    throw new Error(
      `Цена для модели "${params.model}" не задана в MODEL_PRICING. ` +
        `Добавьте её в lib/pricing.ts или передайте корректный slug модели.`
    );
  }

  const inputCost = (params.input_tokens * pricing.input) / PER_MILLION;
  const outputCost = (params.output_tokens * pricing.output) / PER_MILLION;
  const cacheReadCost =
    ((params.cache_read_tokens ?? 0) *
      pricing.input *
      CACHE_MULTIPLIER.read) /
    PER_MILLION;
  const cacheCreationCost =
    ((params.cache_creation_tokens ?? 0) *
      pricing.input *
      CACHE_MULTIPLIER.creation) /
    PER_MILLION;

  return inputCost + outputCost + cacheReadCost + cacheCreationCost;
}
