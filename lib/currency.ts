import { createServerSupabase } from "@/lib/supabase/server";

const CBR_DAILY_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
const DEFAULT_MARKUP_PERCENT = 5;

export type UsdRubRate = {
  /** Итоговый курс с наценкой (то, что платит клиент). */
  rate: number;
  /** Курс ЦБ РФ без наценки. */
  cb_rate: number;
  /** Размер наценки в процентах. */
  markup_percent: number;
};

/** Сегодняшняя дата в формате YYYY-MM-DD по UTC (чтобы исключить гонки). */
function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type CbrResponse = {
  Valute?: { USD?: { Value?: unknown } };
};

async function fetchCbrUsdRate(): Promise<number> {
  const res = await fetch(CBR_DAILY_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ЦБ РФ API вернул статус ${res.status}`);
  }
  const data = (await res.json()) as CbrResponse;
  const value = data?.Valute?.USD?.Value;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("ЦБ РФ API вернул некорректное значение Valute.USD.Value");
  }
  return value;
}

/**
 * Возвращает курс USD/RUB на сегодня (с кэшем в таблице currency_rates).
 *
 * Логика:
 *   1. Если есть запись на сегодня (UTC) — возвращаем её.
 *   2. Иначе — дёргаем ЦБ РФ, считаем `final = cb * 1.05`, апсёртим запись.
 *   3. Если ЦБ недоступно — берём самую свежую запись из БД.
 *   4. Если и в БД ничего нет — выкидываем Error.
 */
export async function getUsdRubRate(): Promise<UsdRubRate> {
  const supabase = await createServerSupabase();
  const today = todayUtcIso();

  // 1) Кэш на сегодня
  const cached = await supabase
    .from("currency_rates")
    .select("usd_rub_cb, usd_rub_final, markup_percent")
    .eq("date", today)
    .maybeSingle();

  if (!cached.error && cached.data) {
    const row = cached.data as {
      usd_rub_cb: number | null;
      usd_rub_final: number | null;
      markup_percent: number | null;
    };
    if (
      typeof row.usd_rub_final === "number" &&
      typeof row.usd_rub_cb === "number"
    ) {
      return {
        rate: row.usd_rub_final,
        cb_rate: row.usd_rub_cb,
        markup_percent:
          typeof row.markup_percent === "number"
            ? row.markup_percent
            : DEFAULT_MARKUP_PERCENT,
      };
    }
  }

  // 2) Тянем у ЦБ
  try {
    const cb = await fetchCbrUsdRate();
    const markup = DEFAULT_MARKUP_PERCENT;
    const final = cb * (1 + markup / 100);

    // upsert по date — на случай гонки между параллельными запросами
    const upsert = await supabase
      .from("currency_rates")
      .upsert(
        {
          date: today,
          usd_rub_cb: cb,
          markup_percent: markup,
          usd_rub_final: final,
          source: "cbr",
        },
        { onConflict: "date", ignoreDuplicates: true }
      );
    if (upsert.error) {
      console.error("[currency] upsert failed", upsert.error);
    }

    return { rate: final, cb_rate: cb, markup_percent: markup };
  } catch (e) {
    console.error("[currency] CBR fetch failed, fallback to latest DB", e);
  }

  // 3) Fallback: самая свежая запись
  const fallback = await supabase
    .from("currency_rates")
    .select("usd_rub_cb, usd_rub_final, markup_percent")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!fallback.error && fallback.data) {
    const row = fallback.data as {
      usd_rub_cb: number | null;
      usd_rub_final: number | null;
      markup_percent: number | null;
    };
    if (
      typeof row.usd_rub_final === "number" &&
      typeof row.usd_rub_cb === "number"
    ) {
      return {
        rate: row.usd_rub_final,
        cb_rate: row.usd_rub_cb,
        markup_percent:
          typeof row.markup_percent === "number"
            ? row.markup_percent
            : DEFAULT_MARKUP_PERCENT,
      };
    }
  }

  throw new Error(
    "Не удалось получить курс USD/RUB: ЦБ РФ недоступен и в БД нет записей"
  );
}
