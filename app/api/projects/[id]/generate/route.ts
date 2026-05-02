import { NextResponse, type NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";

import { callClaude } from "@/lib/ai/claude-client";
import {
  COPYWRITER_SYSTEM_PROMPT,
  buildSingleTextUserPrompt,
} from "@/lib/prompts/copywriter";
import { createServerSupabase } from "@/lib/supabase/server";
import { writeUsageLog } from "@/lib/usage-log";
import { toProjectAnalysis } from "@/lib/types/project-analysis";
import type { AnalysisSegment } from "@/lib/types/project-analysis";
import type { GeneratedAdText } from "@/lib/types/generated-texts";

function isAnalysisSegment(value: unknown): value is AnalysisSegment {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.name === "string";
}

const SINGLE_TEXT_TOOL: Anthropic.Messages.Tool = {
  name: "submit_text",
  description: "Отправляет один сгенерированный рекламный текст",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: [
      "headline",
      "body",
      "cta",
      "cta_button",
      "segment_name",
      "pain_point_addressed",
      "funnel_stage",
      "text_format",
      "approach",
      "approach_explanation",
    ],
    properties: {
      headline: { type: "string" as const },
      body: { type: "string" as const },
      cta: { type: "string" as const },
      cta_button: { type: "string" as const },
      segment_name: { type: "string" as const },
      pain_point_addressed: { type: "string" as const },
      funnel_stage: { type: "string" as const },
      text_format: { type: "string" as const },
      approach: { type: "string" as const },
      approach_explanation: { type: "string" as const },
    },
  },
};

const APPROACH_POOL = [
  "Факт/статистика → проблема → решение",
  "Провокация / вопрос-крючок",
  "Страх потери (FOMO)",
  "Социальное доказательство (отзывы, кейсы, цифры)",
  "История клиента (мини-кейс)",
  "Контринтуитивный тезис / разрушение мифа",
  "Сравнение подходов (до/после, дешёвое vs качественное)",
  "Облегчение — как хорошо когда проблема решена",
  "Результат в цифрах",
  "Отработка главного возражения → гарантия",
];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не настроен" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректное тело запроса" },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const analysis = b.analysis;
  const selectedSegments = b.selectedSegments;
  const trafficDestination = b.trafficDestination;
  const textFormat = b.textFormat;
  const textCount = b.textCount;
  const customWishes = b.customWishes;
  const referenceTexts = b.referenceTexts;
  const feedback = b.feedback;
  const existingTexts = b.existingTexts;
  const selectedModel =
    typeof b.model === "string" ? b.model : "claude-sonnet-4-6";

  const normalizedAnalysis = toProjectAnalysis(analysis);
  if (!normalizedAnalysis) {
    return NextResponse.json(
      { error: "analysis: неверный формат" },
      { status: 400 }
    );
  }
  if (
    !Array.isArray(selectedSegments) ||
    selectedSegments.some((s) => !isAnalysisSegment(s))
  ) {
    return NextResponse.json(
      { error: "selectedSegments: неверный формат" },
      { status: 400 }
    );
  }
  if (typeof trafficDestination !== "string" || !trafficDestination.trim()) {
    return NextResponse.json(
      { error: "trafficDestination: неверный формат" },
      { status: 400 }
    );
  }
  if (textFormat !== "short" && textFormat !== "long" && textFormat !== "mixed") {
    return NextResponse.json(
      { error: "textFormat: неверный формат" },
      { status: 400 }
    );
  }
  const count = typeof textCount === "number" ? textCount : Number(textCount);
  if (!Number.isFinite(count) || count < 1 || count > 10) {
    return NextResponse.json(
      { error: "textCount: неверный формат" },
      { status: 400 }
    );
  }

  let existing: GeneratedAdText[] | undefined;
  if (existingTexts !== undefined) {
    if (!Array.isArray(existingTexts)) {
      return NextResponse.json(
        { error: "existingTexts: неверный формат" },
        { status: 400 }
      );
    }
    existing = existingTexts as GeneratedAdText[];
  }

  try {
    // ── Auth + parent_log_id (последний analyze для этого проекта) ──
    let userId: string | null = null;
    let parentLogId: string | null = null;
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: lastAnalyze } = await supabase
          .from("usage_log")
          .select("id")
          .eq("project_id", projectId)
          .eq("action", "analyze")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        parentLogId =
          (lastAnalyze as { id?: string } | null)?.id ?? null;
      }
    } catch (e) {
      console.error("[generate] failed to resolve user/parent_log_id", e);
    }

    const approaches = Array.from({ length: count }, (_, i) =>
      APPROACH_POOL[i % APPROACH_POOL.length]
    );

    const formats = Array.from({ length: count }, (_, i) => {
      if (textFormat === "mixed") return i % 2 === 0 ? "short" : "long";
      return textFormat;
    });

    const segments = selectedSegments as AnalysisSegment[];
    const segmentAssignments = Array.from({ length: count }, (_, i) =>
      segments[i % segments.length]
    );

    // N параллельных запросов — каждый генерит 1 текст
    const promises = Array.from({ length: count }, (_, i) => {
      const userPrompt = buildSingleTextUserPrompt({
        analysis: normalizedAnalysis,
        segment: segmentAssignments[i],
        trafficDestination: trafficDestination.trim(),
        textFormat: formats[i] as "short" | "long",
        approach: approaches[i],
        customWishes:
          typeof customWishes === "string" ? customWishes : undefined,
        referenceTexts:
          typeof referenceTexts === "string" ? referenceTexts : undefined,
        feedback: typeof feedback === "string" ? feedback : undefined,
        existingTexts: existing,
        textIndex: i + 1,
        totalTexts: count,
      });

      return callClaude({
        systemPrompt: COPYWRITER_SYSTEM_PROMPT,
        userPrompt,
        temperature: 0.65,
        tool: SINGLE_TEXT_TOOL,
        toolName: "submit_text",
        model: selectedModel,
      }).then(async ({ content, tokensUsed, timeMs, usage }) => {
        const text = content as GeneratedAdText | null;
        if (text && typeof text === "object" && "body" in text) {
          text.text_format = (text.body?.length ?? 0) > 600 ? "long" : "short";
        }

        // Логируем расход. Только успешные вызовы Claude.
        // generated_text_id пока null: индивидуальные тексты в БД сохраняет
        // клиент батчем (saveGeneratedTexts), серверу id неизвестен.
        if (text && userId) {
          try {
            await writeUsageLog({
              user_id: userId,
              project_id: projectId,
              action: "generate_text",
              model: selectedModel,
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
              cache_read_tokens: usage.cache_read_tokens,
              cache_creation_tokens: usage.cache_creation_tokens,
              time_ms: timeMs,
              generated_text_id: null,
              parent_log_id: parentLogId,
            });
          } catch (logErr) {
            console.error("[generate] usage log failed (non-fatal)", logErr);
          }
        }

        return { text, tokensUsed, timeMs };
      });
    });

    const results = await Promise.allSettled(promises);

    const texts: GeneratedAdText[] = [];
    let totalTokens = 0;
    let maxTime = 0;

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.text) {
        texts.push(result.value.text);
        totalTokens += result.value.tokensUsed;
        maxTime = Math.max(maxTime, result.value.timeMs);
      } else if (result.status === "rejected") {
        console.error("[generate] Parallel request failed:", result.reason);
      }
    }

    if (texts.length === 0) {
      return NextResponse.json(
        { error: "Не удалось сгенерировать ни одного текста" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      texts,
      tokensUsed: totalTokens,
      timeMs: maxTime,
      model: selectedModel,
    });
  } catch (e) {
    console.error("[generate]", e);
    const message =
      e instanceof Error ? e.message : "Ошибка при обращении к Claude API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

