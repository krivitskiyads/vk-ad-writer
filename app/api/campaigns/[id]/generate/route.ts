import { NextResponse, type NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";

import { callClaude } from "@/lib/ai/claude-client";
import {
  buildCopywriterSystemPrompt,
  buildSingleTextUserPrompt,
  type CopywriterKnowledge,
} from "@/lib/prompts/copywriter";
import {
  getCampaign,
  getCampaignSettings,
  getKnowledgeByIds,
  listCampaignFiles,
  listCampaignTexts,
  listProjectFiles,
  saveCampaignTexts,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import type { AnalysisSegment, ProjectAnalysis } from "@/lib/types/project-analysis";
import { toProjectAnalysis, withStableSegmentIds } from "@/lib/types/project-analysis";
import type { GeneratedAdText } from "@/lib/types/generated-texts";
import { writeUsageLog } from "@/lib/usage-log";

type RouteContext = { params: Promise<{ id: string }> };

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

const DEFAULT_MODEL = "claude-sonnet-4-6";

type FileLike = { name: string; content: string | null };

function buildMaterialsContext(files: FileLike[]): string {
  const withContent = files.filter((f) => (f.content ?? "").trim().length > 0);
  if (withContent.length === 0) return "";
  const blocks = withContent
    .map((f) => `--- Файл: ${f.name} ---\n${f.content}`)
    .join("\n\n");
  return `Материалы для этой задачи:\n\n${blocks}`;
}

function buildSuccessfulTextsContext(files: FileLike[]): string {
  const withContent = files.filter((f) => (f.content ?? "").trim().length > 0);
  if (withContent.length === 0) return "";
  const blocks = withContent
    .map((f) => `--- Пример: ${f.name} ---\n${f.content}`)
    .join("\n\n");
  return `Удачные тексты и посты клиента (ориентир по стилю и подаче, не копируй дословно):\n\n${blocks}`;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не настроен" },
      { status: 500 }
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // тело необязательно (можно генерить вообще без body)
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const feedback = typeof b.feedback === "string" ? b.feedback : undefined;
  const referenceTexts =
    typeof b.referenceTexts === "string" ? b.referenceTexts : undefined;
  const existingTexts = Array.isArray(b.existingTexts)
    ? (b.existingTexts as GeneratedAdText[])
    : undefined;

  try {
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Кампания не найдена" }, { status: 404 });
    }
    if (!campaign.analysis_snapshot) {
      return NextResponse.json(
        {
          error:
            "У кампании нет снимка анализа. Обновите кампанию из проекта (refresh-from-project) или выполните анализ ЦА.",
        },
        { status: 400 }
      );
    }

    const settings = await getCampaignSettings(campaignId);
    const trafficDestination =
      typeof settings?.trafficDestination === "string" &&
      settings.trafficDestination.trim()
        ? settings.trafficDestination.trim()
        : "site";
    const textFormatRaw = settings?.textFormat ?? "short";
    const textFormat: "short" | "long" | "mixed" =
      textFormatRaw === "long" || textFormatRaw === "mixed" ? textFormatRaw : "short";
    const textCount =
      typeof settings?.textCount === "number" && settings.textCount > 0
        ? Math.min(10, Math.floor(settings.textCount))
        : 3;
    const customWishes =
      typeof settings?.customWishes === "string" ? settings.customWishes : "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toneRaw = (settings as any)?.tone;
    const tone =
      typeof toneRaw === "string" && toneRaw.trim() ? toneRaw.trim() : "";
    const model =
      typeof settings?.model === "string" && settings.model.trim()
        ? settings.model.trim()
        : DEFAULT_MODEL;

    const [campaignFiles, projectMaterials, successfulTexts] = await Promise.all([
      listCampaignFiles(campaignId),
      listProjectFiles(campaign.project_id, "material"),
      listProjectFiles(campaign.project_id, "successful_text"),
    ]);
    const materialsContext = buildMaterialsContext([
      ...projectMaterials,
      ...campaignFiles,
    ]);
    const successfulContext = buildSuccessfulTextsContext(successfulTexts);
    const toneBlock = tone ? `Тон речи: ${tone}` : "";
    const wishesCore = [toneBlock, customWishes].filter(Boolean).join("\n\n");
    const augmentedWishes = [materialsContext, successfulContext, wishesCore]
      .filter(Boolean)
      .join("\n\n");

    let knowledgeForCopywriter: CopywriterKnowledge = {
      triggers: [],
      formulas: [],
      structures: [],
    };
    try {
      const techniques = campaign.techniques_snapshot;
      if (techniques) {
        const allIds = [
          ...(Array.isArray(techniques.triggers) ? techniques.triggers : []),
          ...(Array.isArray(techniques.formulas) ? techniques.formulas : []),
          ...(Array.isArray(techniques.structures) ? techniques.structures : []),
        ];
        if (allIds.length > 0) {
          const entries = await getKnowledgeByIds(allIds);
          knowledgeForCopywriter = {
            triggers: entries.filter((e) => e.entry_type === "trigger"),
            formulas: entries.filter((e) => e.entry_type === "formula"),
            structures: entries.filter((e) => e.entry_type === "structure"),
          };
        }
      }
    } catch (kbErr) {
      console.error(
        "[generate] knowledge load failed (non-fatal, fallback to empty)",
        kbErr
      );
    }

    const systemPrompt = buildCopywriterSystemPrompt(knowledgeForCopywriter);

    const snapshotRaw = campaign.analysis_snapshot as ProjectAnalysis;
    const snapshotNorm = withStableSegmentIds(
      toProjectAnalysis(snapshotRaw) ?? snapshotRaw
    );
    const allSegments = (snapshotNorm.segments ?? []) as AnalysisSegment[];
    const selectedIds = campaign.selected_segment_ids ?? [];
    const segments =
      selectedIds.length > 0
        ? allSegments.filter((s) => s.id && selectedIds.includes(s.id))
        : allSegments;
    if (segments.length === 0) {
      return NextResponse.json(
        { error: "В анализе кампании нет сегментов целевой аудитории" },
        { status: 400 }
      );
    }

    const analysisForPrompt: ProjectAnalysis = {
      ...snapshotNorm,
      segments,
    };

    const approaches = Array.from(
      { length: textCount },
      (_, i) => APPROACH_POOL[i % APPROACH_POOL.length]
    );
    const formats = Array.from({ length: textCount }, (_, i) => {
      if (textFormat === "mixed") return i % 2 === 0 ? "short" : "long";
      return textFormat;
    });
    const segmentAssignments = Array.from(
      { length: textCount },
      (_, i) => segments[i % segments.length]
    );

    const promises = Array.from({ length: textCount }, (_, i) => {
      const userPrompt = buildSingleTextUserPrompt({
        analysis: analysisForPrompt,
        segment: segmentAssignments[i],
        trafficDestination,
        textFormat: formats[i] as "short" | "long",
        approach: approaches[i],
        customWishes: augmentedWishes || undefined,
        referenceTexts,
        feedback,
        existingTexts,
        textIndex: i + 1,
        totalTexts: textCount,
      });

      return callClaude({
        systemPrompt,
        userPrompt,
        temperature: 0.65,
        tool: SINGLE_TEXT_TOOL,
        toolName: "submit_text",
        model,
      }).then(async ({ content, tokensUsed, timeMs, usage }) => {
        const text = content as GeneratedAdText | null;
        if (text && typeof text === "object" && "body" in text) {
          text.text_format = (text.body?.length ?? 0) > 600 ? "long" : "short";
        }

        if (text) {
          try {
            await writeUsageLog({
              userId: user.id,
              projectId: campaign.project_id,
              campaignId,
              operation: existingTexts ? "regenerate" : "generate",
              model,
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens,
              cacheReadTokens: usage.cache_read_tokens,
              cacheWriteTokens: usage.cache_creation_tokens,
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

    const existingBatches = await listCampaignTexts(campaignId);
    const nextBatchNumber =
      existingBatches.reduce((m, b) => Math.max(m, b.batch_number ?? 0), 0) + 1;

    const settingsSnapshot = settings
      ? {
          trafficDestination,
          textFormat,
          textCount,
          customWishes,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tone: (settings as any).tone,
          model,
        }
      : null;

    const batch = await saveCampaignTexts(campaignId, {
      batch_number: nextBatchNumber,
      texts,
      tokens_used: totalTokens,
      time_ms: maxTime,
      model,
      settings_snapshot: settingsSnapshot,
      feedback: feedback ?? null,
    });

    return NextResponse.json({ batch });
  } catch (e) {
    console.error("[generate]", e);
    const message =
      e instanceof Error ? e.message : "Ошибка при обращении к Claude API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
