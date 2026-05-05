import "server-only";

import { calculateCostUsd } from "@/lib/pricing";
import { getUsdRubRate } from "@/lib/currency";
import { createServerSupabase } from "@/lib/supabase/server";

export type UsageOperation =
  | "analyze_project"
  | "analyze_campaign"
  | "generate"
  | "regenerate";

export type WriteUsageLogParams = {
  userId: string;
  projectId: string | null;
  campaignId: string | null;
  operation: UsageOperation;
  generatedTextId?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

/**
 * Записывает строку в public.usage_log: считает cost_usd по lib/pricing.ts,
 * подтягивает курс USD/RUB из lib/currency.ts (с кэшем в currency_rates),
 * вставляет полный набор колонок и возвращает запись (id).
 *
 * Привязка:
 * - project_id: обычно всегда заполнен (расход всегда привязан к проекту-бизнесу)
 * - campaign_id: null когда расход на уровне проекта (анализ ЦА)
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
    const cache_read_tokens = params.cacheReadTokens ?? 0;
    const cache_creation_tokens = params.cacheWriteTokens ?? 0;

    const cost_usd = calculateCostUsd({
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cache_read_tokens,
      cache_creation_tokens,
    });

    const { rate, markup_percent } = await getUsdRubRate();
    const cost_rub = cost_usd * rate;

    const total_tokens =
      params.inputTokens +
      params.outputTokens +
      cache_read_tokens +
      cache_creation_tokens;

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("usage_log")
      .insert({
        user_id: params.userId,
        project_id: params.projectId,
        campaign_id: params.campaignId,
        operation: params.operation,
        model: params.model,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        cache_read_tokens,
        cache_creation_tokens,
        total_tokens,
        cost_usd,
        cost_rub,
        usd_rub_rate: rate,
        generated_text_id: params.generatedTextId ?? null,
        // billable / subscription_plan_id остаются дефолтными
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
