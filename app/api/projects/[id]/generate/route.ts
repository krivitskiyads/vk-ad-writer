import { NextResponse, type NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";

import { callClaude } from "@/lib/ai/claude-client";
import {
  buildCopywriterSystemPrompt,
  buildSingleTextUserPrompt,
  type CopywriterKnowledge,
} from "@/lib/prompts/copywriter";
import {
  getKnowledgeByIds,
  getProject,
  getProjectSettings,
  listProjectFiles,
  listProjectTexts,
  saveProjectBatch,
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

function buildFilesBlock(title: string, files: FileLike[], nameLabel: string): string {
  const withContent = files.filter((f) => (f.content ?? "").trim().length > 0);
  if (withContent.length === 0) return "";
  const blocks = withContent
    .map((f) => `--- ${nameLabel}: ${f.name} ---\n${f.content}`)
    .join("\n\n");
  return `${title}:\n\n${blocks}`;
}

function normalizeAnalysis(raw: unknown): ProjectAnalysis | null {
  const parsed = toProjectAnalysis(raw);
  if (!parsed) return null;
  return withStableSegmentIds(parsed);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;

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
    // body optional
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const runContext =
    typeof b.run_context === "string" && b.run_context.trim()
      ? b.run_context.trim()
      : null;

  try {
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.analysis_status !== "ready" || !project.analysis) {
      return NextResponse.json({ error: "Analysis not ready" }, { status: 400 });
    }

    const analysisNorm = normalizeAnalysis(project.analysis);
    if (!analysisNorm) {
      return NextResponse.json({ error: "Analysis not ready" }, { status: 400 });
    }

    const allSegments = (analysisNorm.segments ?? []) as AnalysisSegment[];
    const selectedIds = Array.isArray(project.selected_segment_ids)
      ? project.selected_segment_ids
      : [];
    const segments =
      selectedIds.length > 0
        ? allSegments.filter((s) => s.id && selectedIds.includes(s.id))
        : allSegments;

    if (segments.length === 0) {
      return NextResponse.json({ error: "No segments selected" }, { status: 400 });
    }

    const settings =
      (await getProjectSettings(projectId)) ?? {
        trafficDestination: "site",
        textFormat: "mixed",
        textCount: 5,
        customWishes: "",
        model: DEFAULT_MODEL,
      };

    const trafficDestination =
      typeof settings.trafficDestination === "string" && settings.trafficDestination.trim()
        ? settings.trafficDestination.trim()
        : "site";
    const textCount =
      typeof settings.textCount === "number" && settings.textCount > 0
        ? Math.min(10, Math.max(1, Math.floor(settings.textCount)))
        : 5;
    const textFormat: "short" | "long" | "mixed" =
      settings.textFormat === "long" || settings.textFormat === "mixed"
        ? settings.textFormat
        : "short";
    const model =
      typeof settings.model === "string" && settings.model.trim()
        ? settings.model.trim()
        : DEFAULT_MODEL;

    const [materials, successfulTexts] = await Promise.all([
      listProjectFiles(projectId, "material"),
      listProjectFiles(projectId, "successful_text"),
    ]);

    const materialsContext = buildFilesBlock("Материалы клиента", materials, "Файл");
    const successfulContext = buildFilesBlock(
      "Удачные тексты и посты клиента (ориентир по стилю и подаче, не копируй дословно)",
      successfulTexts,
      "Пример"
    );
    const runContextBlock = runContext
      ? `ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ ДЛЯ ЭТОГО ПРОГОНА:\n${runContext}\nЭто уточнение к задаче от пользователя — учти его при написании текстов.`
      : "";
    const wishesCore = (settings.customWishes ?? "").trim();
    const augmentedWishes = [materialsContext, successfulContext, runContextBlock, wishesCore]
      .filter(Boolean)
      .join("\n\n");

    let knowledgeForCopywriter: CopywriterKnowledge = {
      triggers: [],
      formulas: [],
      structures: [],
    };
    try {
      const techniques = project.selected_techniques;
      if (techniques) {
        const ids = [
          ...(Array.isArray(techniques.triggers) ? techniques.triggers : []),
          ...(Array.isArray(techniques.formulas) ? techniques.formulas : []),
          ...(Array.isArray(techniques.structures) ? techniques.structures : []),
        ];
        if (ids.length > 0) {
          const entries = await getKnowledgeByIds(ids);
          knowledgeForCopywriter = {
            triggers: entries.filter((e) => e.entry_type === "trigger"),
            formulas: entries.filter((e) => e.entry_type === "formula"),
            structures: entries.filter((e) => e.entry_type === "structure"),
          };
        }
      }
    } catch (kbErr) {
      console.error("[project-generate] knowledge load failed (non-fatal)", kbErr);
    }

    const systemPrompt = buildCopywriterSystemPrompt(knowledgeForCopywriter);

    const analysisForPrompt: ProjectAnalysis = {
      ...analysisNorm,
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
              projectId,
              operation: "generate",
              model,
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens,
              cacheReadTokens: usage.cache_read_tokens,
              cacheWriteTokens: usage.cache_creation_tokens,
            });
          } catch (logErr) {
            console.error("[project-generate] usage log failed (non-fatal)", logErr);
          }
        }
        return { text, tokensUsed, timeMs };
      });
    });

    const results = await Promise.allSettled(promises);
    const texts: GeneratedAdText[] = [];
    let totalTokens = 0;
    let maxTime = 0;

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.text) {
        texts.push(r.value.text);
        totalTokens += r.value.tokensUsed;
        maxTime = Math.max(maxTime, r.value.timeMs);
      } else if (r.status === "rejected") {
        console.error("[project-generate] parallel request failed:", r.reason);
      }
    }

    if (texts.length === 0) {
      return NextResponse.json({ error: "All generations failed" }, { status: 500 });
    }

    const existingBatches = await listProjectTexts(projectId);
    const maxBatchNumber = existingBatches.reduce(
      (m, b) => Math.max(m, b.batch_number ?? 0),
      0
    );

    const saved = await saveProjectBatch(projectId, {
      texts,
      settings_snapshot: settings,
      run_context: runContext,
      model,
      batch_number: maxBatchNumber + 1,
    });

    return NextResponse.json(saved);
  } catch (e) {
    console.error("[POST /api/projects/:id/generate]", e);
    const message =
      e instanceof Error ? e.message : "Ошибка при генерации";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

