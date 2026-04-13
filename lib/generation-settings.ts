export const STORAGE_KEY_GENERATION_SETTINGS = "generation_settings";

export type TrafficDestination =
  | "vk_lead"
  | "senler"
  | "community_messages"
  | "community_subscribe"
  | "site"
  | "marketplace"
  | "quiz"
  | "avito";

export type TextFormat = "short" | "long" | "mixed";

export type GenerationSettings = {
  trafficDestination: TrafficDestination;
  textFormat: TextFormat;
  textCount: number;
  customWishes: string;
};

export const TRAFFIC_OPTIONS: Array<{
  value: TrafficDestination;
  label: string;
}> = [
  { value: "vk_lead", label: "Лид-форма ВК" },
  { value: "senler", label: "Чат-бот (Senler)" },
  { value: "community_messages", label: "Сообщения сообщества" },
  { value: "community_subscribe", label: "Подписка на сообщество" },
  { value: "site", label: "Сайт / лендинг" },
  { value: "marketplace", label: "Маркетплейс (WB / Ozon)" },
  { value: "quiz", label: "Квиз" },
  { value: "avito", label: "Авито" },
];

export const TEXT_FORMAT_OPTIONS: Array<{
  value: TextFormat;
  label: string;
}> = [
  { value: "short", label: "Короткие (300-500 символов)" },
  { value: "long", label: "Длинные (700-1200 символов)" },
  { value: "mixed", label: "Микс (и короткие, и длинные)" },
];

export function trafficDestinationLabel(value: string): string {
  return TRAFFIC_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
