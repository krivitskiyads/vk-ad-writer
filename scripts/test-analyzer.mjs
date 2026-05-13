// Минимальный репро бага с selected_techniques.
//
// Делает 5 вызовов к Anthropic с РЕАЛЬНЫМ системным промптом и tool schema,
// но с очень простым user prompt. Логирует:
//  - stop_reason (главное!)
//  - output_tokens
//  - какие поля присутствуют в tool_use.input
//  - размеры массивов selected_techniques.{triggers,formulas,structures}
//  - длину reasoning
//
// Также прогоняем один тест с большим max_tokens, чтобы доказать что баг — это
// truncation, а не сама модель/промпт.
//
// Usage: node scripts/test-analyzer.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import Anthropic from "@anthropic-ai/sdk";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// ----- 1. Тянем меню знаний так же, как делает прод -----
async function getKnowledgeMenu() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/knowledge_base?is_active=eq.true&select=id,entry_type,title,short_description,applicable_to,tags,priority&order=priority.desc`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  return res.json();
}

// ----- 2. Воспроизводим formatKnowledgeMenu из prod -----
function formatGroup(items) {
  return items
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .map((it) => `${it.id} | ${it.title} — ${it.short_description ?? ""}`)
    .join("\n");
}

function buildSystemPrompt(menu) {
  const triggers = formatGroup(menu.filter((m) => m.entry_type === "trigger"));
  const formulas = formatGroup(menu.filter((m) => m.entry_type === "formula"));
  const structures = formatGroup(menu.filter((m) => m.entry_type === "structure"));
  const principles = formatGroup(menu.filter((m) => m.entry_type === "principle"));

  return `Ты — AI-аналитик рекламных проектов для таргетированной рекламы ВКонтакте. У тебя 11 лет практического опыта в настройке таргета ВК и более 300 реализованных рекламных кампаний в разных нишах.

ФОРМАТ: Ты ОБЯЗАН вернуть ТОЛЬКО один JSON-объект с ключами "business", "segments", "positioning", "warnings". Никаких массивов, никаких рекламных текстов, никаких пояснений. Только JSON-объект. Первый символ ответа = {, последний = }.

ТВОЯ ЗАДАЧА

Таргетолог загрузил материалы по проекту клиента. На основе этих данных ты должен:
1. Определить нишу и тип бизнеса
2. Разбить целевую аудиторию на 2-5 сегментов
3. Для каждого сегмента выявить боли, желания, возражения и триггеры
4. Сформулировать позиционирование для рекламы
5. Дать предупреждения по модерации и особенностям ниши

═══════════════════════════════════════════════════
БАЗА ЗНАНИЙ ПО КОПИРАЙТИНГУ
═══════════════════════════════════════════════════

ТРИГГЕРЫ (выбери 2-4 штуки):
${triggers}

ФОРМУЛЫ (выбери 1):
${formulas}

СТРУКТУРЫ (выбери 1-2):
${structures}

ПРИНЦИПЫ:
${principles}

Верни выбор техник в поле selected_techniques tool submit_analysis (id из меню выше + reasoning).

КРИТИЧЕСКИ ВАЖНО:
- Твой ответ — это ОДИН JSON-объект с ключами "business", "segments", "positioning", "warnings"
- НЕ возвращай ничего кроме JSON-объекта описанной выше структуры
- Первый символ ответа должен быть { и последний символ должен быть }`;
}

// ----- 3. Tool schema (минимальная копия prod) -----
const GENDER_ENUM = ["all", "male", "female", "mostly_male", "mostly_female"];
const INCOME_ENUM = ["low", "medium", "above_medium", "high", "premium"];

const ANALYSIS_TOOL = {
  name: "submit_analysis",
  description: "Отправляет результат анализа проекта",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["business", "segments", "positioning", "warnings", "selected_techniques"],
    properties: {
      business: {
        type: "object",
        additionalProperties: false,
        required: ["niche", "niche_category", "business_type", "geo", "average_check", "usp", "description_summary"],
        properties: {
          niche: { type: "string" },
          niche_category: { type: "string" },
          business_type: { type: "string" },
          geo: { type: "string" },
          average_check: { type: "string" },
          usp: { type: "array", items: { type: "string" } },
          description_summary: { type: "string" },
        },
      },
      segments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "description", "demographics", "pain_points", "desires", "objections", "triggers", "priority"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            demographics: {
              type: "object",
              additionalProperties: false,
              required: ["age_from", "age_to", "gender", "income"],
              properties: {
                age_from: { type: "number" },
                age_to: { type: "number" },
                gender: { type: "string", enum: GENDER_ENUM },
                income: { type: "string", enum: INCOME_ENUM },
              },
            },
            pain_points: { type: "array", items: { type: "string" } },
            desires: { type: "array", items: { type: "string" } },
            objections: { type: "array", items: { type: "string" } },
            triggers: { type: "array", items: { type: "string" } },
            priority: { type: "string" },
          },
        },
      },
      positioning: {
        type: "object",
        additionalProperties: false,
        required: ["main_message", "tone_of_voice", "key_benefits"],
        properties: {
          main_message: { type: "string" },
          tone_of_voice: { type: "string" },
          key_benefits: { type: "array", items: { type: "string" } },
        },
      },
      warnings: { type: "array", items: { type: "string" } },
      selected_techniques: {
        type: "object",
        additionalProperties: false,
        required: ["triggers", "formulas", "structures", "reasoning"],
        properties: {
          triggers: { type: "array", items: { type: "string" } },
          formulas: { type: "array", items: { type: "string" } },
          structures: { type: "array", items: { type: "string" } },
          reasoning: { type: "string" },
        },
      },
    },
  },
};

const USER_PROMPT_SIMPLE = `### КОНТЕКСТ ОТ ЮЗЕРА
Проанализируй бизнес: интернет-магазин кроссовок.

Это описание задачи от пользователя — учти его при анализе ЦА.

ВАЖНО: Верни ответ СТРОГО в формате JSON-объекта с полями business, segments, positioning, warnings, selected_techniques.`;

async function runOne(label, { systemPrompt, userPrompt, max_tokens }) {
  const t0 = Date.now();
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens,
    temperature: 0.4,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "submit_analysis" },
  });
  const ms = Date.now() - t0;

  const toolBlock = msg.content.find((b) => b.type === "tool_use");
  const inp = toolBlock?.input ?? {};
  const st = inp.selected_techniques ?? {};

  console.log(
    `[${label}] stop_reason=${msg.stop_reason} out=${msg.usage.output_tokens} in=${msg.usage.input_tokens} time=${ms}ms`
  );
  console.log(
    `  keys: [${Object.keys(inp).join(", ")}]   segments=${(inp.segments ?? []).length}`
  );
  console.log(
    `  selected_techniques: t=${(st.triggers ?? []).length} f=${(st.formulas ?? []).length} s=${(st.structures ?? []).length} reasoning_len=${(st.reasoning ?? "").length}`
  );
  return { stop_reason: msg.stop_reason, output_tokens: msg.usage.output_tokens };
}

async function main() {
  console.log("Тяну меню знаний...");
  const menu = await getKnowledgeMenu();
  console.log(`Меню: ${menu.length} записей (triggers/formulas/structures/principles)`);

  const sys = buildSystemPrompt(menu);
  console.log(`Системный промпт: ${sys.length} символов`);
  console.log();

  console.log("=== БЛОК A: 5 запусков с max_tokens=4096 (как в prod) ===");
  for (let i = 1; i <= 5; i++) {
    await runOne(`A${i}/4096`, {
      systemPrompt: sys,
      userPrompt: USER_PROMPT_SIMPLE,
      max_tokens: 4096,
    });
  }

  console.log("\n=== БЛОК B: 2 запуска с max_tokens=8192 (контроль) ===");
  for (let i = 1; i <= 2; i++) {
    await runOne(`B${i}/8192`, {
      systemPrompt: sys,
      userPrompt: USER_PROMPT_SIMPLE,
      max_tokens: 8192,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
