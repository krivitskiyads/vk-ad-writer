import { NextResponse, type NextRequest } from "next/server";

import type Anthropic from "@anthropic-ai/sdk";

import { callClaude } from "@/lib/ai/claude-client";
import { buildAnalystSystemPrompt } from "@/lib/prompts/analyst";
import {
  getKnowledgeMenu,
  getProject,
  listProjectFiles,
  setProjectAnalysis,
  setProjectAnalysisStatus,
} from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import { type ProjectAnalysis, withStableSegmentIds } from "@/lib/types/project-analysis";
import type { ProjectFile } from "@/lib/types/project-files";
import type { SelectedTechniques } from "@/lib/types/knowledge-base";
import { writeUsageLog } from "@/lib/usage-log";

const ANALYZE_MODEL = "claude-sonnet-4-6";

const JSON_UTF8 = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

const ANALYSIS_TOOL: Anthropic.Messages.Tool = {
  name: "submit_analysis",
  description: "Отправляет результат анализа проекта",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: [
      "business",
      "segments",
      "positioning",
      "warnings",
      "selected_techniques",
    ],
    properties: {
      business: {
        type: "object" as const,
        additionalProperties: false,
        required: [
          "niche",
          "niche_category",
          "business_type",
          "geo",
          "average_check",
          "usp",
          "description_summary",
        ],
        properties: {
          niche: { type: "string" as const },
          niche_category: { type: "string" as const },
          business_type: { type: "string" as const },
          geo: { type: "string" as const },
          average_check: { type: "string" as const },
          usp: { type: "array" as const, items: { type: "string" as const } },
          description_summary: { type: "string" as const },
        },
      },
      segments: {
        type: "array" as const,
        items: {
          type: "object" as const,
          additionalProperties: false,
          required: [
            "name",
            "description",
            "demographics",
            "pain_points",
            "desires",
            "objections",
            "triggers",
            "priority",
          ],
          properties: {
            name: { type: "string" as const },
            description: { type: "string" as const },
            demographics: {
              type: "object" as const,
              additionalProperties: false,
              required: ["age_from", "age_to", "gender", "income"],
              properties: {
                age_from: { type: "number" as const },
                age_to: { type: "number" as const },
                gender: { type: "string" as const },
                income: { type: "string" as const },
              },
            },
            pain_points: {
              type: "array" as const,
              items: { type: "string" as const },
            },
            desires: {
              type: "array" as const,
              items: { type: "string" as const },
            },
            objections: {
              type: "array" as const,
              items: { type: "string" as const },
            },
            triggers: {
              type: "array" as const,
              items: { type: "string" as const },
            },
            priority: { type: "string" as const },
          },
        },
      },
      positioning: {
        type: "object" as const,
        additionalProperties: false,
        required: ["main_message", "tone_of_voice", "key_benefits"],
        properties: {
          main_message: { type: "string" as const },
          tone_of_voice: { type: "string" as const },
          key_benefits: {
            type: "array" as const,
            items: { type: "string" as const },
          },
        },
      },
      warnings: {
        type: "array" as const,
        items: { type: "string" as const },
      },
      selected_techniques: {
        type: "object" as const,
        additionalProperties: false,
        required: ["triggers", "formulas", "structures", "reasoning"],
        properties: {
          triggers: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "Массив id триггеров из базы знаний (2-4 штуки, комбинировать из разных групп)",
          },
          formulas: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "Массив id формул (обычно 1 элемент: AIDA, PAS, PPPP или FAB)",
          },
          structures: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "Массив id структур (1-2 элемента, под формат текста и нишу)",
          },
          reasoning: {
            type: "string" as const,
            description:
              "Обоснование выбора техник: почему именно эти подходят этому проекту. 2-4 предложения.",
          },
        },
      },
    },
  },
};

function pickAnalysis(content: unknown): ProjectAnalysis | null {
  if (typeof content !== "object" || content === null) return null;
  const o = content as Record<string, unknown>;
  if (typeof o.business !== "object" || o.business === null) return null;
  return {
    business: o.business as ProjectAnalysis["business"],
    segments: Array.isArray(o.segments)
      ? (o.segments as ProjectAnalysis["segments"])
      : [],
    positioning:
      typeof o.positioning === "object" &&
      o.positioning !== null &&
      !Array.isArray(o.positioning)
        ? (o.positioning as ProjectAnalysis["positioning"])
        : {},
    warnings: Array.isArray(o.warnings) ? (o.warnings as string[]) : [],
  };
}

function pickSelectedTechniques(content: unknown): SelectedTechniques | null {
  if (typeof content !== "object" || content === null) return null;
  const raw = (content as { selected_techniques?: unknown }).selected_techniques;
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const triggers = Array.isArray(r.triggers)
    ? r.triggers.filter((x): x is string => typeof x === "string")
    : null;
  const formulas = Array.isArray(r.formulas)
    ? r.formulas.filter((x): x is string => typeof x === "string")
    : null;
  const structures = Array.isArray(r.structures)
    ? r.structures.filter((x): x is string => typeof x === "string")
    : null;
  const reasoning = typeof r.reasoning === "string" ? r.reasoning : null;
  if (!triggers || !formulas || !structures || reasoning === null) return null;
  return { triggers, formulas, structures, reasoning };
}

function buildAnalystUserPrompt(
  description: string | null,
  files: ProjectFile[]
): string {
  const desc = (description ?? "").trim();
  const filesWithContent = files.filter((f) => (f.content ?? "").trim().length > 0);

  const parts: string[] = [];

  if (desc) {
    parts.push(
      `### КОНТЕКСТ ОТ ЮЗЕРА\n${desc}\n\nЭто описание задачи от пользователя — учти его при анализе ЦА.`
    );
  }

  if (filesWithContent.length > 0) {
    const blocks = filesWithContent
      .map((f) => `--- Файл: ${f.name} ---\n${f.content}`)
      .join("\n\n");
    parts.push(`### МАТЕРИАЛЫ КЛИЕНТА\n\n${blocks}`);
  }

  parts.push(
    "ВАЖНО: Верни ответ СТРОГО в формате JSON-объекта с полями business, segments, positioning, warnings, selected_techniques. НЕ возвращай массив, НЕ возвращай список, НЕ возвращай текст. Только JSON-объект."
  );

  return parts.join("\n\n");
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не настроен" },
      { status: 500, headers: JSON_UTF8 }
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: JSON_UTF8 }
    );
  }

  try {
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Проект не найден" },
        { status: 404, headers: JSON_UTF8 }
      );
    }

    let knowledgeMenu: Awaited<ReturnType<typeof getKnowledgeMenu>> = [];
    try {
      knowledgeMenu = await getKnowledgeMenu();
    } catch (kbErr) {
      console.error(
        "[analyze] getKnowledgeMenu failed (non-fatal, fallback to empty menu)",
        kbErr
      );
    }

    const files = await listProjectFiles(projectId, "material");
    const descLen = (project.description ?? "").trim().length;
    if (files.length === 0 && descLen < 1) {
      return NextResponse.json(
        { error: "Нет материалов для анализа" },
        { status: 400, headers: JSON_UTF8 }
      );
    }

    await setProjectAnalysisStatus(projectId, "analyzing");
    const systemPrompt = buildAnalystSystemPrompt(knowledgeMenu);
    const userPrompt = buildAnalystUserPrompt(project.description, files);

    console.log("[analyze] starting", {
      projectId,
      filesCount: files.length,
      menuItems: knowledgeMenu.length,
      systemPromptLength: systemPrompt.length,
    });

    const start = performance.now();
    const { content, usage } = await callClaude({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      tool: ANALYSIS_TOOL,
      toolName: "submit_analysis",
      model: ANALYZE_MODEL,
    });
    const time_ms = Math.round(performance.now() - start);

    const analysisRaw = pickAnalysis(content);
    const techniques = pickSelectedTechniques(content);

    if (!analysisRaw) {
      await setProjectAnalysisStatus(projectId, "failed");
      return NextResponse.json(
        { error: "Аналитик вернул некорректный ответ" },
        { status: 502, headers: JSON_UTF8 }
      );
    }

    const analysis = withStableSegmentIds(analysisRaw);

    const safeTechniques: SelectedTechniques = techniques ?? {
      triggers: [],
      formulas: [],
      structures: [],
      reasoning: "",
    };

    const updatedProject = await setProjectAnalysis(
      projectId,
      analysis,
      safeTechniques
    );

    try {
      await writeUsageLog({
        userId: user.id,
        projectId,
        operation: "analyze_project",
        model: ANALYZE_MODEL,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usage.cache_read_tokens,
        cacheWriteTokens: usage.cache_creation_tokens,
      });
    } catch (logErr) {
      console.error("[analyze] usage log failed (non-fatal)", logErr);
    }

    console.log("[analyze] done", { projectId, time_ms });

    return NextResponse.json(
      { project: updatedProject },
      { headers: JSON_UTF8 }
    );
  } catch (e) {
    console.error("[analyze]", e);
    try {
      await setProjectAnalysisStatus(projectId, "failed");
    } catch (statusErr) {
      console.error("[analyze] failed to mark status (non-fatal)", statusErr);
    }
    const message =
      e instanceof Error ? e.message : "Ошибка при обращении к Claude API";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: JSON_UTF8 }
    );
  }
}
