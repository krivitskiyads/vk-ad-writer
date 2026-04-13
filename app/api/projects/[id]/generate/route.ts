import { NextResponse, type NextRequest } from "next/server";

import { callClaude } from "@/lib/ai/claude-client";
import {
  COPYWRITER_SYSTEM_PROMPT,
  buildCopywriterUserPrompt,
} from "@/lib/prompts/copywriter";
import { isProjectAnalysis } from "@/lib/types/project-analysis";
import type { AnalysisSegment } from "@/lib/types/project-analysis";
import { isGeneratedTextsResponse } from "@/lib/types/generated-texts";
import type { GeneratedAdText } from "@/lib/types/generated-texts";

function isAnalysisSegment(value: unknown): value is AnalysisSegment {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.name === "string";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await context.params;

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

  if (!isProjectAnalysis(analysis)) {
    return NextResponse.json({ error: "analysis: неверный формат" }, { status: 400 });
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
  if (
    textFormat !== "short" &&
    textFormat !== "long" &&
    textFormat !== "mixed"
  ) {
    return NextResponse.json({ error: "textFormat: неверный формат" }, { status: 400 });
  }
  const count = typeof textCount === "number" ? textCount : Number(textCount);
  if (!Number.isFinite(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: "textCount: неверный формат" }, { status: 400 });
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

  const userPrompt = buildCopywriterUserPrompt({
    analysis,
    selectedSegments: selectedSegments as AnalysisSegment[],
    trafficDestination: trafficDestination.trim(),
    textFormat,
    textCount: count,
    customWishes: typeof customWishes === "string" ? customWishes : undefined,
    referenceTexts: typeof referenceTexts === "string" ? referenceTexts : undefined,
    feedback: typeof feedback === "string" ? feedback : undefined,
    existingTexts: existing,
  });

  try {
    const { content, tokensUsed, timeMs } = await callClaude({
      systemPrompt: COPYWRITER_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.8,
    });

    if (!isGeneratedTextsResponse(content)) {
      return NextResponse.json(
        { error: "Некорректный JSON от модели" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      texts: content.texts,
      tokensUsed,
      timeMs,
    });
  } catch (e) {
    console.error("[generate]", e);
    const message =
      e instanceof Error ? e.message : "Ошибка при обращении к Claude API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

