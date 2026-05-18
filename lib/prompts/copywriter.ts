import type { AnalysisSegment, ProjectAnalysis } from "@/lib/types/project-analysis";
import type { GeneratedAdText } from "@/lib/types/generated-texts";
import type { KnowledgeBaseEntry } from "@/lib/types/knowledge-base";

/**
 * Что диктует структуру одного текста при генерации.
 * Иерархия выбирается в generate/route.ts через pickAssignments.
 */
export type Assignment =
  | { type: "structure"; entry: KnowledgeBaseEntry }
  | { type: "formula"; entry: KnowledgeBaseEntry }
  | { type: "approach"; approach: string };

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

export type CopywriterTextFormat = "short" | "long" | "mixed" | "micro";

export function buildCopywriterSystemPrompt(
  knowledge: CopywriterKnowledge | null | undefined,
  opts?: { textFormat?: CopywriterTextFormat }
): string {
  const formulas = knowledge?.formulas ?? [];
  const triggers = knowledge?.triggers ?? [];
  const structures = knowledge?.structures ?? [];

  const hasTechniques = Boolean(
    knowledge && (triggers.length || formulas.length || structures.length)
  );

  const formulasBlock = formatGroup(formulas, formatFormula);
  const triggersBlock = formatGroup(triggers, formatTrigger);
  const structuresBlock = formatGroup(structures, formatStructure);

  const techniqueSubsections: string[] = [];
  if (structures.length > 0) {
    techniqueSubsections.push(
      `СТРУКТУРЫ (готовые блоки текста под формат ВК):\n${structuresBlock}`
    );
  }
  if (formulas.length > 0) {
    techniqueSubsections.push(
      `ФОРМУЛЫ (стратегия построения целого текста):\n${formulasBlock}`
    );
  }
  if (triggers.length > 0) {
    techniqueSubsections.push(
      `ТРИГГЕРЫ (психологические крючки — вплетай 2-4 в каждый текст):\n${triggersBlock}`
    );
  }

  const techniquesSection = hasTechniques
    ? `
═══════════════════════════════════════════════════
ТЕХНИКИ ДЛЯ ЭТОГО ПРОЕКТА
═══════════════════════════════════════════════════

Для этого проекта выбраны конкретные техники из базы знаний.

${techniqueSubsections.join("\n\n")}

КАК ПРИМЕНЯТЬ ТЕХНИКИ:

1. ПРИОРИТЕТ: если в user-промпте задана ОБЯЗАТЕЛЬНАЯ СТРУКТУРА или ОБЯЗАТЕЛЬНАЯ ФОРМУЛА — следуй ей буквально, блок за блоком, в указанном порядке. Список подходов из секции «ПОДХОДЫ К НАПИСАНИЮ ТЕКСТОВ» ниже игнорируй — он используется только когда конкретная техника не задана.
2. Если в user-промпте задана структура — её блоки разделяются пропусками строк, каждый блок выполняет ровно ту функцию, что в нём описана. Не сливай блоки в сплошной текст.
3. Если в user-промпте задана формула — все её этапы должны явно прозвучать в тексте в указанном порядке.
4. Триггеры (если они в списке выше) вплетай в любой текст как психологические усиления — 2-4 триггера на текст, варьируй их между текстами в батче.
5. Тексты должны звучать естественно, не как набор техник. Фразы-примеры из триггеров — это ориентир, а не дословный шаблон. Адаптируй смысл под нишу.
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

  const TECHNIQUES_PLACEHOLDER = "__TECHNIQUES_BLOCK__";

  const microSection =
    opts?.textFormat === "micro"
      ? `

═══════════════════════════════════════════════════
МИКРО-ФОРМАТ
═══════════════════════════════════════════════════

Микро-формат: 80–200 символов. Только цепляющий заголовок (короткая фраза-крючок) и короткий призыв к действию. Идеально для рекламы с целью «подписка на сообщество» в VK Ads. Без длинных описаний, без историй, без перечня выгод. Цель — зацепить и сразу получить подписку.
`
      : "";

  const basePrompt = `Ты — AI-копирайтер, специализирующийся на рекламных текстах для таргетированной рекламы ВКонтакте. 11 лет опыта, 300+ кампаний.

ТВОЯ ЗАДАЧА

На основе анализа проекта и настроек от таргетолога сгенерировать рекламные тексты для ВКонтакте.

${noEmDashSection}

Тебе будут переданы:
— Анализ бизнеса (ниша, гео, УТП, позиционирование)
— Выбранные сегменты ЦА с болями, возражениями, триггерами
— Куда ведётся трафик (лид-форма, Senler, сообщения и т.д.)
— Формат текстов (микро / короткий / длинный / микс)
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
      "approach": "Точное название использованной техники (структуры, формулы или подхода) — так, как оно задано в user-промпте",
      "approach_explanation": "Почему выбран именно этот подход — 1-2 предложения"
    }
  ]
}

═══════════════════════════════════════════════════
ВАЖНО: РАЗДЕЛЕНИЕ ПОЛЕЙ headline / body / cta
═══════════════════════════════════════════════════

headline, body и cta — это РАЗНЫЕ части одного текста. Фронтенд при показе соединит их в порядке: headline → пустая строка → body → пустая строка → cta. Поэтому:

- В body НЕ повторяй headline в начале. headline уже отображается отдельно сверху.
- В body НЕ повторяй cta в конце. cta уже отображается отдельно снизу.
- body содержит ТОЛЬКО средние блоки текста между заголовком и призывом.

Если в обязательной структуре первый блок — вопрос-крючок или заголовочное утверждение, положи его в headline (не дублируй в body).
Если последний блок — призыв к действию, положи его в cta (не дублируй в body).
Всё что между — только в body.

Пример (структура "Вопрос + 3 буллита + CTA"):
- headline: "Хочешь, чтобы стрижка держала форму 3 недели?"
- body: "— Работаем только проверенными ножницами\n— Подбираем форму под овал лица\n— Бесплатная консультация после стрижки"
- cta: "Запись на эту неделю до пятницы. Звони или пиши в сообщения."

НЕПРАВИЛЬНО (старое поведение):
- headline: "Хочешь...?"
- body: "Хочешь...?\n\n— Работаем...\n\nЗапись..."
- cta: "Запись..."

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

vk_subscribe:
— CTA на подписку: "Подпишись", "В сообществе ещё больше пользы"
— Идеально для прогрева перед продажей, хорошо сочетается с микро-форматом

site:
— CTA на переход: "Подробнее на сайте", "Изучить условия"
— Более развёрнутый текст уместен

quiz:
— CTA на прохождение квиза: "Узнай за 1 минуту", "Пройди тест"
— Делай акцент на интригу и пользу

vk_lead_form:
— CTA на заявку прямо в ВК: "Оставь заявку", "Запишись"
— Нужны чёткая конкретика и обещание быстрого результата

community_messages:
— CTA написать в личку: "Напиши «хочу» в сообщения", "Задай вопрос — ответим лично"
— Тон диалога и персонального общения

senler:
— CTA подписки на чат-бота: "Подпишись на рассылку", "Получи материалы в личку"
— Обещай понятную ценность подписки

marketplace:
— CTA перейти на карточку: "Найти на WB", "Заказать на Ozon"
— Упор на отзывы, цену и понятность оффера

avito:
— CTA посмотреть объявление: "Подробности на Авито", "Цена в объявлении"
— Локальная подача, конкретика по объявлению

ПРАВИЛА НАПИСАНИЯ

1. Если в user-промпте задана ОБЯЗАТЕЛЬНАЯ СТРУКТУРА или ОБЯЗАТЕЛЬНАЯ ФОРМУЛА — следуй ей буквально. Список подходов в этой секции игнорируй. Каждый текст пишется по заданной технике; разнообразие достигается за счёт болей, тона, триггеров — но не за счёт смены каркаса.

   Если обязательная техника НЕ задана (fallback на APPROACH_POOL) — тогда каждый текст должен использовать ДРУГОЙ подход и логику воздействия, не повторяя структуры из соседних текстов того же батча.

2. Первое предложение — самое важное. Оно видно до "показать полностью" в ленте ВК. Оно должно цеплять и останавливать скролл.

3. Длина:
   — Микро: 80–200 символов; только заголовок-крючок и короткий призыв
   — Короткий: 300-500 символов
   — Длинный: 700-1200 символов

4. Эмодзи: 2-4 на текст, уместно, не в каждом предложении.

5. Обращение на «вы».

6. Каждый текст закрывает конкретную боль из анализа.

7. К каждому тексту — пояснение (approach_explanation): почему именно этот подход, какой психологический механизм используется. 1-2 предложения.

8. Конкретика: числа, сроки, факты — если есть в материалах. Не придумывай цифры, которых нет в исходных данных.

9. Если пожелания таргетолога заданы — учитывать в первую очередь.

10. Если даны референсы текстов — проанализируй их стиль, структуру, тональность, длину и используй как ориентир. Не копируй их дословно, но пиши в похожем стиле.

${microSection}
${TECHNIQUES_PLACEHOLDER}
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

  if (!hasTechniques) {
    return basePrompt.replace(`${TECHNIQUES_PLACEHOLDER}\n`, "");
  }

  return basePrompt.replace(TECHNIQUES_PLACEHOLDER, techniquesSection.trim());
}

export function buildCopywriterUserPrompt(input: {
  analysis: ProjectAnalysis;
  selectedSegments: AnalysisSegment[];
  trafficDestination: string;
  textFormat: CopywriterTextFormat;
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
  textFormat: CopywriterTextFormat;
  assignment: Assignment;
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
    assignment,
    customWishes,
    referenceTexts,
    feedback,
    existingTexts,
    textIndex,
    totalTexts,
  } = input;

  const lengthInstructions: Record<
    "short" | "medium" | "long" | "mixed" | "micro",
    string
  > = {
    micro:
      "Длина: микро-формат — 80–200 символов всего. Только цепляющий заголовок (короткая фраза-крючок) и короткий призыв к действию. Без длинных описаний, историй и перечня выгод.",
    short: "Длина: короткий текст — 1-3 коротких абзаца, концентрированно",
    medium: "Длина: средний текст — 4-6 абзацев, развёрнуто но без воды",
    long: "Длина: длинный текст — 7+ абзацев, детально с раскрытием боли и решения",
    mixed:
      "Длина: подбери оптимальную длину под конкретную боль и сегмент. Где-то достаточно 2 абзацев, где-то нужно 6-8. Решай сам — главное чтобы текст работал на конверсию.",
  };

  const lengthKey: "short" | "medium" | "long" | "mixed" | "micro" =
    textFormat === "micro"
      ? "micro"
      : textFormat === "short"
        ? "short"
        : textFormat === "long"
          ? "long"
          : "mixed";

  const techniqueInstruction = buildTechniqueInstruction(assignment);

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
    `- ${lengthInstructions[lengthKey]}`,
    "",
    techniqueInstruction,
    "",
    "ЗАДАЧА:",
    "Напиши один рекламный текст для ВКонтакте, строго следуя обязательной технике, описанной выше.",
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

/**
 * Собирает жёсткую инструкцию по обязательной технике для одного текста.
 * Для структуры/формулы — разворачивает блоки из БД в пошаговый blueprint.
 * Для подхода из пула (fallback) — даёт привычную мягкую инструкцию.
 */
function buildTechniqueInstruction(assignment: Assignment): string {
  if (assignment.type === "structure") {
    const e = assignment.entry;
    const c = (e.content ?? {}) as Record<string, unknown>;
    const principle = getString(c, "principle");
    const blocks = getStringArray(c, "blocks");
    const formatForVk = getString(c, "format_for_vk");
    const exampleText = getString(c, "example_text");

    const parts: string[] = [`ОБЯЗАТЕЛЬНАЯ СТРУКТУРА: ${e.title}`];
    if (principle) parts.push(`Принцип: ${principle}`);
    if (blocks.length > 0) {
      const blocksList = blocks.map((b, i) => `${i + 1}. ${b}`).join("\n");
      parts.push(`Блоки (СТРОГО в этом порядке, не пропускать и не менять местами):\n${blocksList}`);
    }
    if (formatForVk) parts.push(`Формат для ВК: ${formatForVk}`);
    if (exampleText) {
      parts.push(`Пример рабочего текста по этой структуре (для ориентира по тону и длине, НЕ копировать дословно):\n${exampleText}`);
    }
    parts.push(
      "ВАЖНО: эту структуру нельзя нарушать. Между блоками — пропуски строк (пустые строки). Каждый блок выполняет ровно ту функцию, что в нём описана. В поле approach JSON-ответа верни строку точно: \"" + e.title + "\"."
    );
    return parts.join("\n\n");
  }

  if (assignment.type === "formula") {
    const e = assignment.entry;
    const c = (e.content ?? {}) as Record<string, unknown>;
    const principle = getString(c, "principle");
    const steps = getStringArray(c, "structure");
    const howTo = getString(c, "how_to_apply");
    const tpl = getString(c, "example_template");
    const bestFor = getString(c, "best_for");

    const parts: string[] = [`ОБЯЗАТЕЛЬНАЯ ФОРМУЛА: ${e.title}`];
    if (principle) parts.push(`Принцип: ${principle}`);
    if (steps.length > 0) {
      const stepsList = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      parts.push(`Этапы (СТРОГО в этом порядке, каждый этап обязателен):\n${stepsList}`);
    }
    if (howTo) parts.push(`Как применять: ${howTo}`);
    if (tpl) {
      parts.push(`Пример рабочего текста по этой формуле (для ориентира, НЕ копировать дословно):\n${tpl}`);
    }
    if (bestFor) parts.push(`Хорошо подходит для: ${bestFor}`);
    parts.push(
      "ВАЖНО: эту формулу нельзя нарушать. Каждый этап должен явно прозвучать в тексте в указанном порядке. В поле approach JSON-ответа верни строку точно: \"" + e.title + "\"."
    );
    return parts.join("\n\n");
  }

  return [
    `Обязательный подход: ${assignment.approach}`,
    `Напиши текст в логике этого подхода. В поле approach JSON-ответа верни строку точно: "${assignment.approach}".`,
  ].join("\n");
}

