export const STORAGE_KEY_GENERATION_SETTINGS = "generation_settings";

export type ClaudeModel =
  | "claude-haiku-4-5-20251001"
  | "claude-sonnet-4-6"
  | "claude-opus-4-6";

export const MODEL_OPTIONS = [
  {
    value: "claude-haiku-4-5-20251001" as ClaudeModel,
    label: "Haiku 4.5 — быстрый, экономичный",
    price: "~8 ₽/проект",
  },
  {
    value: "claude-sonnet-4-6" as ClaudeModel,
    label: "Sonnet 4.6 — баланс цены и качества",
    price: "~26 ₽/проект",
  },
  {
    value: "claude-opus-4-6" as ClaudeModel,
    label: "Opus 4.6 — максимальное качество",
    price: "~43 ₽/проект",
  },
] as const;

export type TrafficDestination =
  | "vk_subscribe"
  | "community_messages"
  | "site"
  | "quiz"
  | "vk_lead_form"
  | "senler"
  | "marketplace"
  | "avito";

export type TextFormat = "micro" | "short" | "long" | "mixed";

export type GenerationSettings = {
  trafficDestination: TrafficDestination;
  textFormat: TextFormat;
  textCount: number;
  customWishes: string;
  model?: ClaudeModel;
};

export const TRAFFIC_OPTIONS: Array<{
  value: TrafficDestination;
  label: string;
}> = [
  { value: "vk_subscribe", label: "Подписка на сообщество ВК" },
  { value: "site", label: "Сайт / лендинг" },
  { value: "quiz", label: "Квиз" },
  { value: "vk_lead_form", label: "Лид-форма ВК" },
  { value: "community_messages", label: "Сообщения сообщества" },
  { value: "senler", label: "Чат-бот (Senler)" },
  { value: "marketplace", label: "Маркетплейс (WB / Ozon)" },
  { value: "avito", label: "Авито" },
];

export const TEXT_FORMAT_OPTIONS: Array<{
  value: TextFormat;
  label: string;
  hint?: string;
}> = [
  {
    value: "micro",
    label: "Микро (заголовок + призыв) — для подписки на сообщество",
    hint: "80–200 символов",
  },
  { value: "short", label: "Короткие (300–500 символов)" },
  { value: "long", label: "Длинные (700–1200 символов)" },
  { value: "mixed", label: "Микс (и короткие, и длинные)" },
];

export function trafficDestinationLabel(value: string): string {
  return TRAFFIC_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
