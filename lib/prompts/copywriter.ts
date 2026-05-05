import type { AnalysisSegment, ProjectAnalysis } from "@/lib/types/project-analysis";
import type { GeneratedAdText } from "@/lib/types/generated-texts";
import type { KnowledgeBaseEntry } from "@/lib/types/knowledge-base";

export type CopywriterKnowledge = {
  triggers: KnowledgeBaseEntry[];
  formulas: KnowledgeBaseEntry[];
  structures: KnowledgeBaseEntry[];
};

/** Безопасное чтение строкового поля из content jsonb. */
function getString(content: Record<string, unknown>, key: string): string {
  const v = content[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Безопасное чтение массива строк из content jsonb. */
function getStringArray(
  content: Record<string, unknown>,
  key: string
): string[] {
  const v = content[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function formatTrigger(entry: KnowledgeBaseEntry): string {
  const c = entry.content ?? {};
  const principle = getString(c, "principle");
  const howTo = getString(c, "how_to_apply");
  const phrases = getStringArray(c, "example_phrases").slice(0, 2);

  const lines: string[] = [`► ТРИГГЕР: ${entry.title}`];
  if (principle) lines.push(`Принцип: ${principle}`);
  if (howTo) lines.push(`Как применять: ${howTo}`);
  if (phrases.length > 0) {
    lines.push("Примеры фраз:");
    for (const p of phrases) lines.push(`- ${p}`);
  }
  return lines.join("\n");
}

function formatFormula(entry: KnowledgeBaseEntry): string {
  const c = entry.content ?? {};
  const principle = getString(c, "principle");
  const howTo = getString(c, "how_to_apply");
  const structure = getStringArray(c, "structure");
  const tpl = getString(c, "example_template");
  const bestFor = getString(c, "best_for");

  const lines: string[] = [`► ФОРМУЛА: ${entry.title}`];
  if (principle) lines.push(`Принцип: ${principle}`);
  if (structure.length > 0) {
    lines.push("Этапы:");
    structure.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  if (howTo) lines.push(`Как применять: ${howTo}`);
  if (tpl) lines.push(`Шаблон: ${tpl}`);
  if (bestFor) lines.push(`Лучше всего для: ${bestFor}`);
  return lines.join("\n");
}

function formatStructure(entry: KnowledgeBaseEntry): string {
  const c = entry.content ?? {};
  const principle = getString(c, "principle");
  const blocks = getStringArray(c, "blocks");
  const formatForVk = getString(c, "format_for_vk");
  const exampleText = getString(c, "example_text");

  const lines: string[] = [`► СТРУКТУРА: ${entry.title}`];
  if (principle) lines.push(`Принцип: ${principle}`);
  if (blocks.length > 0) {
    lines.push("Блоки:");
    blocks.forEach((b, i) => lines.push(`${i + 1}. ${b}`));
  }
  if (formatForVk) lines.push(`Формат для ВК: ${formatForVk}`);
  if (exampleText) lines.push(`Пример текста:\n${exampleText}`);
  return lines.join("\n");
}

function formatGroup<T>(items: T[], formatter: (x: T) => string): string {
  if (items.length === 0) return "(аналитик не выбрал)";
  return items.map(formatter).join("\n\n");
}

export function buildCopywriterSystemPrompt(
  knowledge: CopywriterKnowledge
): string {
  const formulasBlock = formatGroup(knowledge.formulas, formatFormula);
  const triggersBlock = formatGroup(knowledge.triggers, formatTrigger);
  const structuresBlock = formatGroup(knowledge.structures, formatStructure);

  const hasAnyKnowledge =
    knowledge.formulas.length +
      knowledge.triggers.length +
      knowledge.structures.length >
    0;

  const techniquesSection = hasAnyKnowledge
    ? `
═══════════════════════════════════════════════════
ТЕХНИКИ ДЛЯ ЭТОГО ПРОЕКТА
═══════════════════════════════════════════════════

Аналитик выбрал для этого проекта конкретные техники из базы знаний. Применяй их в каждом тексте.

ФОРМУЛА (стратегия построения целого текста):
${formulasBlock}

ТРИГГЕРЫ (психологические крючки — комбинируй 2-4 в каждом тексте):
${triggersBlock}

СТРУКТУРЫ (каркас под формат ВК — выбирай одну на текст):
${structuresBlock}

КАК ПРИМЕНЯТЬ:

1. Каждый текст строй по выбранной формуле — это главный каркас.
2. Внутри формулы органично вплетай 2-4 триггера из списка. Не используй один и тот же триггер во всех текстах одного батча — варьируй комбинации.
3. Используй структуру как ритмический и визуальный каркас (где блоки текста, где переносы, где списки).
4. Тексты должны звучать естественно, не как набор техник. Если фраза-пример из триггера не подходит контексту — адаптируй смысл под нишу, не копируй буквально.
5. Если выбрано 2 структуры — чередуй их между текстами в батче, чтобы выходило разнообразно.
`
    : "";

  const noEmDashSection = `
## ОФОРМЛЕНИЕ — ЖЁСТКИЕ ЗАПРЕТЫ

Запрещено использовать длинное тире (—) в текстах. Категорически. Ни одного.

Вместо длинного тире используй:
• Двоеточие, если поясняешь: «Главное: качество»
• Запятую, если уточняешь: «Качество, без компромиссов»
• Точку и новое предложение
• Дефис в составных словах: «бизнес-задача»

Это правило важнее любых стилистических соображений. Перед возвратом текста проверь его на наличие символа — и перепиши, если нашёл.
`;

  return `Ты — AI-копирайтер, специализирующийся на рекламных текстах для таргетированной рекламы ВКонтакте. 11 лет опыта, 300+ кампаний.

ТВОЯ ЗАДАЧА

На основе анализа проекта и настроек от таргетолога сгенерировать рекламные тексты для ВКонтакте.

${noEmDashSection}

Тебе будут переданы:
— Анализ бизнеса (ниша, гео, УТП, позиционирование)
— Выбранные сегменты ЦА с болями, возражениями, триггерами
— Куда ведётся трафик (лид-форма, Senler, сообщения и т.д.)
— Формат текстов (короткий / длинный / микс)
— Количество текстов
— Пожелания таргетолога (если есть)
— Примеры текстов-референсов (если есть) — анализируй их стиль, тональность и структуру, и используй как ориентир

ФОРМАТ ОТВЕТА

Верни СТРОГО JSON. Без markdown, без пояснений.

{
  "texts": [
    {
      "headline": "Заголовок объявления (до 80 символов)",
      "body": "Основной текст объявления",
      "cta": "Призыв к действию (последнее предложение)",
      "cta_button": "Текст кнопки",
      "segment_name": "Для какого сегмента",
      "pain_point_addressed": "Какую боль закрывает",
      "funnel_stage": "cold | warm | hot",
      "text_format": "short | long",
      "approach": "Название подхода (из списка ниже)",
      "approach_explanation": "Почему выбран именно этот подход — 1-2 предложения"
    }
  ]
}

ПОДХОДЫ К НАПИСАНИЮ ТЕКСТОВ

Это критически важно. Каждый текст должен использовать ДРУГОЙ подход. Не повторяй структуры, не используй одни и те же триггеры.

Список подходов (но не ограничивайся ими, придумывай свои):

РАЦИОНАЛЬНЫЕ:
— Факт/статистика → проблема → решение
— Конкретный инсайт, который цепляет
— Контринтуитивный тезис ("Почему дешёвый ремонт обходится дороже")
— Разрушение мифа ("Почему 'подождать до понедельника' — плохая стратегия")
— Сравнение подходов ("Чем отличается диагностика за 500 руб. от бесплатной")

ЭМОЦИОНАЛЬНЫЕ:
— Провокация / вопрос, который не даёт покоя
— Страх потери (FOMO) — что теряешь, пока не решаешь проблему
— Облегчение — как хорошо, когда проблема решена
— Узнавание ситуации ("Знакомо? Приезжаешь в сервис, а там...")

ДОКАЗАТЕЛЬНЫЕ:
— Социальное доказательство (отзывы, количество клиентов, кейсы)
— Результат в цифрах (до/после, экономия, сроки)
— История клиента ("Один из клиентов обратился с...")
— Антипример ("Пока другие обещают — мы показываем на видео")

СТРУКТУРНЫЕ ФОРМУЛЫ:
— Боль → Усиление → Решение → CTA
— Вопрос-крючок → Интрига → Оффер → CTA
— Мини-история → Мораль → Оффер → CTA
— Напоминание → Спецусловие → Срочность → CTA
— Отработка возражения → Гарантия → CTA

АДАПТАЦИЯ ПОД ПЛОЩАДКУ ТРАФИКА

Лид-форма ВК:
— Кнопка: "Оставить заявку", "Записаться", "Получить расчёт"
— Снижать тревогу: "Без обязательств", "Бесплатно", "За 2 минуты"

Чат-бот (Senler):
— Кнопка: "Написать боту", "Получить в чате"
— Упомянуть что ответ придёт мгновенно

Сообщения сообщества:
— Кнопка: "Написать", "Задать вопрос"
— Тон более личный и разговорный

Подписка на сообщество:
— Кнопка: "Подписаться", "Вступить"
— Обещать пользу от подписки

Сайт / лендинг:
— Кнопка: "На сайт", "Подробнее", "Смотреть каталог"

Маркетплейс (WB / Ozon):
— Кнопка: "Купить на WB", "Смотреть на Ozon"
— Упомянуть отзывы, рейтинг, быструю доставку

Квиз:
— Кнопка: "Пройти тест", "Узнать за 2 минуты"
— Интрига: "Ответьте на 3 вопроса и узнайте..."

Авито:
— Кнопка: "Смотреть на Авито", "Открыть объявление"
— Упомянуть конкретику: цену, наличие, район

ПРАВИЛА НАПИСАНИЯ

1. Каждый текст — ДРУГОЙ подход и логика воздействия. Не повторяй структуры и триггеры.

2. Первое предложение — самое важное. Оно видно до "показать полностью" в ленте ВК. Оно должно цеплять и останавливать скролл.

3. Длина:
   — Короткий: 300-500 символов
   — Длинный: 700-1200 символов

4. Эмодзи: 2-4 на текст, уместно, не в каждом предложении.

5. Обращение на «вы».

6. Каждый текст закрывает конкретную боль из анализа.

7. К каждому тексту — пояснение (approach_explanation): почему именно этот подход, какой психологический механизм используется. 1-2 предложения.

8. Конкретика: числа, сроки, факты — если есть в материалах. Не придумывай цифры, которых нет в исходных данных.

9. Если пожелания таргетолога заданы — учитывать в первую очередь.

10. Если даны референсы текстов — проанализируй их стиль, структуру, тональность, длину и используй как ориентир. Не копируй их дословно, но пиши в похожем стиле.

${techniquesSection}
ОГРАНИЧЕНИЯ МОДЕРАЦИИ ВК

Нельзя использовать:
— "уникальный", "лучший", "номер 1"
— "гарантируем результат", "100% качество"
— Сравнение с конкурентами ("лучше чем у X")
— Капслок для целых слов
— Кликбейт и ложные обещания
— Медицинские термины без лицензии
— Обещание конкретных сроков без оговорок

Весь ответ — на русском языке.`;
}

export function buildCopywriterUserPrompt(input: {
  analysis: ProjectAnalysis;
  selectedSegments: AnalysisSegment[];
  trafficDestination: string;
  textFormat: "short" | "long" | "mixed";
  textCount: number;
  customWishes?: string;
  referenceTexts?: string;
  feedback?: string;
  existingTexts?: GeneratedAdText[];
}): string {
  const {
    analysis,
    selectedSegments,
    trafficDestination,
    textFormat,
    textCount,
    customWishes,
    referenceTexts,
    feedback,
    existingTexts,
  } = input;

  return [
    "ДАННЫЕ ПРОЕКТА (JSON):",
    JSON.stringify(
      {
        business: analysis.business,
        positioning: analysis.positioning,
        warnings: analysis.warnings,
      },
      null,
      2
    ),
    "",
    "ВЫБРАННЫЕ СЕГМЕНТЫ ЦА (JSON):",
    JSON.stringify(selectedSegments, null, 2),
    "",
    "НАСТРОЙКИ ГЕНЕРАЦИИ:",
    `- Куда ведём трафик: ${trafficDestination}`,
    `- Формат текстов: ${textFormat}`,
    `- Количество текстов: ${textCount}`,
    customWishes?.trim() ? `- Пожелания: ${customWishes.trim()}` : null,
    "",
    referenceTexts?.trim()
      ? [
          "РЕФЕРЕНСЫ ТЕКСТОВ (для ориентира по стилю/тону/структуре, не копировать дословно):",
          referenceTexts.trim(),
          "",
        ].join("\n")
      : null,
    feedback?.trim()
      ? [
          "ФИДБЕК ТАРГЕТОЛОГА (учесть при генерации):",
          feedback.trim(),
          "",
        ].join("\n")
      : null,
    existingTexts && existingTexts.length
      ? [
          "ТЕКУЩИЕ СГЕНЕРИРОВАННЫЕ ТЕКСТЫ (JSON) — используй как контекст при перегенерации/улучшении:",
          JSON.stringify(existingTexts, null, 2),
          "",
        ].join("\n")
      : null,
    "ТРЕБОВАНИЯ:",
    "- Верните строго JSON по схеме.",
    "- Каждый текст — другой подход (не повторять структуру).",
    "- Вставляйте уместные эмодзи 2–4 на текст.",
    "- Обращение на «вы».",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSingleTextUserPrompt(input: {
  analysis: ProjectAnalysis;
  segment: AnalysisSegment;
  trafficDestination: string;
  textFormat: "short" | "long";
  approach: string;
  customWishes?: string;
  referenceTexts?: string;
  feedback?: string;
  existingTexts?: GeneratedAdText[];
  textIndex: number;
  totalTexts: number;
}): string {
  const {
    analysis,
    segment,
    trafficDestination,
    textFormat,
    approach,
    customWishes,
    referenceTexts,
    feedback,
    existingTexts,
    textIndex,
    totalTexts,
  } = input;

  return [
    `Сгенерируй ОДИН рекламный текст (текст ${textIndex} из ${totalTexts}).`,
    "",
    "БИЗНЕС:",
    JSON.stringify(
      {
        business: analysis.business,
        positioning: analysis.positioning,
        warnings: analysis.warnings,
      },
      null,
      2
    ),
    "",
    "ЦЕЛЕВОЙ СЕГМЕНТ (пиши именно для него):",
    JSON.stringify(segment, null, 2),
    "",
    "ПАРАМЕТРЫ:",
    `- Куда ведём трафик: ${trafficDestination}`,
    `- Формат: ${
      textFormat === "long"
        ? "длинный (700-1200 символов)"
        : "короткий (300-500 символов)"
    }`,
    `- Обязательный подход: ${approach}`,
    "",
    "ЗАДАЧА:",
    `Напиши один рекламный текст для ВКонтакте, используя подход \"${approach}\".`,
    "Сфокусируйся на конкретной боли этого сегмента.",
    "Текст должен быть живым, конкретным, без штампов.",
    "Первое предложение должно останавливать скролл.",
    "",
    customWishes?.trim()
      ? `ПОЖЕЛАНИЯ ТАРГЕТОЛОГА: ${customWishes.trim()}\n`
      : null,
    referenceTexts?.trim()
      ? `РЕФЕРЕНСЫ (ориентируйся на стиль, не копируй):\n${referenceTexts.trim()}\n`
      : null,
    feedback?.trim()
      ? `ФИДБЕК (учти при генерации):\n${feedback.trim()}\n`
      : null,
    existingTexts && existingTexts.length > 0
      ? `УЖЕ СГЕНЕРИРОВАННЫЕ ТЕКСТЫ (не повторяй их подходы и крючки):\n${JSON.stringify(
          existingTexts.map((t) => ({ headline: t.headline, approach: t.approach })),
          null,
          2
        )}\n`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

