import { NextResponse, type NextRequest } from "next/server";

import type Anthropic from "@anthropic-ai/sdk";

import { callClaude } from "@/lib/ai/claude-client";
import { ANALYST_SYSTEM_PROMPT } from "@/lib/prompts/analyst";

const ANALYSIS_TOOL: Anthropic.Messages.Tool = {
  name: "submit_analysis",
  description: "Отправляет результат анализа проекта",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["business", "segments", "positioning", "warnings"],
    properties: {
      business: {
        type: "object" as const,
        additionalProperties: false,
        required: ["niche", "niche_category", "business_type", "geo", "average_check", "usp", "description_summary"],
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
          required: ["name", "description", "demographics", "pain_points", "desires", "objections", "triggers", "priority"],
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
            pain_points: { type: "array" as const, items: { type: "string" as const } },
            desires: { type: "array" as const, items: { type: "string" as const } },
            objections: { type: "array" as const, items: { type: "string" as const } },
            triggers: { type: "array" as const, items: { type: "string" as const } },
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
          key_benefits: { type: "array" as const, items: { type: "string" as const } },
        },
      },
      warnings: {
        type: "array" as const,
        items: { type: "string" as const },
      },
    },
  },
};

const JSON_UTF8 = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

type ProjectFileContentEntry = { fileName: string; content: string };

function parseProjectFilesContent(body: unknown): ProjectFileContentEntry[] {
  if (typeof body !== "object" || body === null) return [];
  if (!("project_files_content" in body)) return [];
  const raw = (body as { project_files_content: unknown })
    .project_files_content;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x): ProjectFileContentEntry[] => {
    if (typeof x !== "object" || x === null) return [];
    const fileName =
      "fileName" in x && typeof x.fileName === "string" ? x.fileName : null;
    const content =
      "content" in x && typeof x.content === "string" ? x.content : null;
    if (fileName === null || content === null) return [];
    return [{ fileName, content }];
  });
}

function buildAnalystUserPrompt(
  description: string,
  files: ProjectFileContentEntry[]
): string {
  const desc = description.trim();
  let userPrompt = `Описание проекта: ${desc}`;
  if (files.length > 0) {
    const blocks = files
      .map((f) => `--- Файл: ${f.fileName} ---\n${f.content}`)
      .join("\n\n");
    userPrompt += `\n\nСодержимое загруженных файлов:\n\n${blocks}`;
  }
  userPrompt +=
    "\n\nВАЖНО: Верни ответ СТРОГО в формате JSON-объекта с полями business, segments, positioning, warnings. НЕ возвращай массив, НЕ возвращай список, НЕ возвращай текст. Только JSON-объект.";
  return userPrompt;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await context.params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не настроен" },
      { status: 500, headers: JSON_UTF8 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректное тело запроса" },
      { status: 400, headers: JSON_UTF8 }
    );
  }

  const description =
    typeof body === "object" &&
    body !== null &&
    "description" in body &&
    typeof (body as { description: unknown }).description === "string"
      ? (body as { description: string }).description
      : "";

  const projectFilesContent = parseProjectFilesContent(body);
  const userPrompt = buildAnalystUserPrompt(description, projectFilesContent);

  try {
    console.log(
      "[analyze] system prompt prefix:",
      ANALYST_SYSTEM_PROMPT.slice(0, 100)
    );
    const { content, tokensUsed, timeMs } = await callClaude({
      systemPrompt: ANALYST_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.4,
      tool: ANALYSIS_TOOL,
      toolName: "submit_analysis",
    });

    const responseBody = {
      analysis: content === undefined ? null : content,
      tokensUsed,
      timeMs,
    };
    console.log(
      "[analyze] response payload (full, before NextResponse.json)",
      responseBody
    );

    return NextResponse.json(responseBody, { headers: JSON_UTF8 });
  } catch (e) {
    console.error("[analyze]", e);
    const message =
      e instanceof Error ? e.message : "Ошибка при обращении к Claude API";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: JSON_UTF8 }
    );
  }
}
