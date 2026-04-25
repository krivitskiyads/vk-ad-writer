import Anthropic from "@anthropic-ai/sdk";

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
  tool,
  toolName,
  model = "claude-sonnet-4-6",
}: {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  tool?: Anthropic.Messages.Tool;
  toolName?: string;
  model?: string;
}): Promise<CallClaudeResult> {
  const started = Date.now();
  const client = getAnthropicClient();

  // Если передан tool — используем tool use для гарантированной структуры
  const toolParams = tool && toolName
    ? {
        tools: [tool],
        tool_choice: { type: "tool" as const, name: toolName },
      }
    : {};

  const message = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    ...toolParams,
  });

  let content: unknown = null;

  // Извлекаем из tool_use блока если есть
  if (tool && toolName) {
    for (const block of message.content) {
      if (block.type === "tool_use" && block.name === toolName) {
        content = block.input;
        break;
      }
    }
  }

  // Fallback: парсим текст
  if (content === null) {
    const text = extractTextFromMessage(message);
    if (text.trim()) {
      try {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start >= 0 && end > start) {
          content = JSON.parse(text.slice(start, end + 1));
        }
      } catch {
        // ignore
      }
    }
  }

  const input = message.usage?.input_tokens ?? 0;
  const output = message.usage?.output_tokens ?? 0;
  const tokensUsed = input + output;
  const timeMs = Date.now() - started;

  return { content, tokensUsed, timeMs };
}
