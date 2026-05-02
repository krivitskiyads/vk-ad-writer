import "server-only";

import { calculateCostUsd } from "@/lib/pricing";
import { getUsdRubRate } from "@/lib/currency";
import { createServerSupabase } from "@/lib/supabase/server";

export type WriteUsageLogParams = {
  user_id: string;
  project_id: string;
  action: "analyze" | "generate_text";
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
  time_ms: number;
  generated_text_id?: string | null;
  parent_log_id?: string | null;
};

/**
 * Записывает строку в public.usage_log: считает cost_usd по lib/pricing.ts,
 * подтягивает курс USD/RUB из lib/currency.ts (с кэшем в currency_rates),
 * вставляет полный набор колонок и возвращает запись (id).
 *
 * Все ошибки глушим: трекинг не должен ронять основной запрос.
 * Возвращает null, если запись не удалось вставить.
 *
 * Server-only: использует createServerSupabase() (cookies/next-headers),
 * поэтому файл нельзя импортировать из клиентских компонентов.
 */
export async function writeUsageLog(
  params: WriteUsageLogParams
): Promise<{ id: string } | null> {
  try {
    const cache_read_tokens = params.cache_read_tokens ?? 0;
    const cache_creation_tokens = params.cache_creation_tokens ?? 0;

    const cost_usd = calculateCostUsd({
      model: params.model,
      input_tokens: params.input_tokens,
      output_tokens: params.output_tokens,
      cache_read_tokens,
      cache_creation_tokens,
    });

    const { rate, markup_percent } = await getUsdRubRate();
    const cost_rub = cost_usd * rate;

    const total_tokens =
      params.input_tokens +
      params.output_tokens +
      cache_read_tokens +
      cache_creation_tokens;

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("usage_log")
      .insert({
        user_id: params.user_id,
        project_id: params.project_id,
        action: params.action,
        model: params.model,
        input_tokens: params.input_tokens,
        output_tokens: params.output_tokens,
        cache_read_tokens,
        cache_creation_tokens,
        total_tokens,
        cost_usd,
        cost_rub,
        usd_rub_rate: rate,
        time_ms: params.time_ms,
        generated_text_id: params.generated_text_id ?? null,
        parent_log_id: params.parent_log_id ?? null,
        // was_billed остаётся дефолтом (false)
        // subscription_plan_id остаётся null
        // markup_percent уже сохранён в currency_rates
      })
      .select("id")
      .single();

    if (error) {
      console.error("[writeUsageLog] insert failed", error, {
        markup_percent,
      });
      return null;
    }
    return (data as { id: string } | null) ?? null;
  } catch (e) {
    console.error("[writeUsageLog] failed", e);
    return null;
  }
}
