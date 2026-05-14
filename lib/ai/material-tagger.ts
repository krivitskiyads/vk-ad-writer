import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import {
  callClaude,
  type CallClaudeUsage,
} from "@/lib/ai/claude-client";
import {
  normalizeMaterialTag,
  type MaterialTag,
} from "@/lib/types/workspace-materials";

export type TokenUsage = CallClaudeUsage;

export const MATERIAL_TAG_TOOL: Anthropic.Messages.Tool = {
  name: "submit_classification",
  description: "Классифицирует материал по типу для рекламной кампании",
  input_schema: {
    type: "object" as const,
    required: ["tag", "reasoning"],
    additionalProperties: false,
    properties: {
      tag: {
        type: "string" as const,
        enum: [
          "brief",
          "product",
          "reviews",
          "cases",
          "audience",
          "competitors",
          "ready_texts",
          "messages",
          "posts",
          "other",
        ],
        description: "Один из 10 типов материала",
      },
      reasoning: {
        type: "string" as const,
        description:
          "Краткое (1-2 предложения) обоснование выбора тега",
      },
    },
  },
};

const MATERIAL_TAG_SYSTEM_PROMPT = `Ты классифицируешь материалы для AI-сервиса генерации рекламных текстов в ВКонтакте.

Тебе дают начало содержимого файла + расширение + имя файла. Определи тип материала.

Доступные теги:
- brief: ТЗ, бриф клиента, описание задачи кампании
- product: описание продукта/услуги/бизнеса, лендинги, презентации о компании
- reviews: отзывы клиентов, обратная связь, упоминания в соцсетях
- cases: успешные истории клиентов, до/после, результаты в цифрах
- audience: анализ ЦА, портреты клиентов, демография, JTBD
- competitors: анализ конкурентов, рынка, ценовые сравнения
- ready_texts: готовые рекламные тексты, объявления, посты, креативы для запуска
- messages: диалоги клиентов из ВК/мессенджеров (часто CSV с колонками 'Тип', 'Текст', 'Пользователь')
- posts: посты сообщества из ВК со статистикой (CSV с колонками 'Текст', 'Лайков', 'Просмотров', 'Комментариев')
- other: всё что не подходит

ВАЖНО:
- Для CSV смотри в первую очередь на заголовки колонок — они выдают тип данных
- Если входящие/исходящие сообщения с пользователями — это messages, не reviews
- Если статистика постов с метриками — это posts, не ready_texts
- Если сомневаешься — используй other, но только если действительно нет подходящего тега

Верни классификацию через tool submit_classification.`;

const EMPTY_USAGE: TokenUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
};

export const MATERIAL_TAG_CLASSIFIER_MODEL =
  "claude-haiku-4-5-20251001" as const;

function parseClassificationContent(
  content: unknown
): { tag: string; reasoning: string } | null {
  if (!content || typeof content !== "object") return null;
  const o = content as Record<string, unknown>;
  const tag = o.tag;
  const reasoning = o.reasoning;
  if (typeof tag !== "string" || typeof reasoning !== "string") return null;
  return { tag, reasoning };
}

export async function classifyMaterial(params: {
  contentText: string;
  fileExtension: string;
  sourceFilename: string;
}): Promise<{ tag: MaterialTag; reasoning: string; usage: TokenUsage }> {
  const slicedContent = params.contentText.slice(0, 3000);
  const userPrompt = `Файл: ${params.sourceFilename}
Расширение: ${params.fileExtension}

Начало содержимого:
${slicedContent}

Классифицируй через submit_classification.`;

  try {
    const { content, usage } = await callClaude({
      systemPrompt: MATERIAL_TAG_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      maxTokens: 500,
      model: MATERIAL_TAG_CLASSIFIER_MODEL,
      tool: MATERIAL_TAG_TOOL,
      toolName: "submit_classification",
    });

    const parsed = parseClassificationContent(content);
    if (!parsed) {
      return { tag: "other", reasoning: "fallback", usage };
    }

    return {
      tag: normalizeMaterialTag(parsed.tag),
      reasoning: parsed.reasoning.trim() || "fallback",
      usage,
    };
  } catch {
    return { tag: "other", reasoning: "fallback", usage: EMPTY_USAGE };
  }
}
