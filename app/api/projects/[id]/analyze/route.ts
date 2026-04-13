import { NextResponse, type NextRequest } from "next/server";

import { callClaude } from "@/lib/ai/claude-client";
import { ANALYST_SYSTEM_PROMPT } from "@/lib/prompts/analyst";

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
    const { content, tokensUsed, timeMs } = await callClaude({
      systemPrompt: ANALYST_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.4,
    });

    return NextResponse.json({ analysis: content, tokensUsed, timeMs });
  } catch (e) {
    console.error("[analyze]", e);
    const message =
      e instanceof Error ? e.message : "Ошибка при обращении к Claude API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
