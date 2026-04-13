import Anthropic from "@anthropic-ai/sdk";

import { parseJsonFromClaudeText } from "@/lib/ai/parse-claude-json";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

export type CallClaudeResult = {
  content: unknown;
  tokensUsed: number;
  timeMs: number;
};

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не задан");
  }
  return new Anthropic({ apiKey });
}

function extractTextFromMessage(message: Anthropic.Messages.Message): string {
  return message.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export async function callClaude({
  systemPrompt,
  userPrompt,
  temperature,
}: {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}): Promise<CallClaudeResult> {
  const started = Date.now();
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = extractTextFromMessage(message);
  let content: unknown;
  try {
    content = parseJsonFromClaudeText(text);
  } catch (e) {
    // Важно: логируем сырой ответ, чтобы видеть, что реально присылает модель.
    console.log("[callClaude] Raw model text (parse failed):\n", text);

    // Мягкий fallback: вырезаем JSON между первой { и последней }.
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        const sliced = text.slice(start, end + 1);
        content = JSON.parse(sliced);
      } else {
        throw e;
      }
    } catch {
      // Пробрасываем исходную ошибку парсинга (с понятным текстом из parseJsonFromClaudeText).
      throw e;
    }
  }

  const input = message.usage?.input_tokens ?? 0;
  const output = message.usage?.output_tokens ?? 0;
  const tokensUsed = input + output;
  const timeMs = Date.now() - started;

  return { content, tokensUsed, timeMs };
}
