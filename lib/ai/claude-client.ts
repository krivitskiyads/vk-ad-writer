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
  const content = parseJsonFromClaudeText(text);

  const input = message.usage?.input_tokens ?? 0;
  const output = message.usage?.output_tokens ?? 0;
  const tokensUsed = input + output;
  const timeMs = Date.now() - started;

  return { content, tokensUsed, timeMs };
}
