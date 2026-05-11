export const TRAFFIC_DESTINATION_OPTIONS = [
  { value: "vk_subscribe", label: "Подписка на сообщество ВК" },
  { value: "site", label: "Сайт / лендинг" },
  { value: "quiz", label: "Квиз" },
  { value: "vk_lead_form", label: "Лид-форма ВК" },
  { value: "community_messages", label: "Сообщения сообщества" },
  { value: "senler", label: "Чат-бот (Senler)" },
  { value: "marketplace", label: "Маркетплейс (WB / Ozon)" },
  { value: "avito", label: "Авито" },
] as const;

export type TrafficDestination =
  (typeof TRAFFIC_DESTINATION_OPTIONS)[number]["value"];

const TRAFFIC_SET = new Set<string>(
  TRAFFIC_DESTINATION_OPTIONS.map((o) => o.value)
);

export function normalizeTrafficDestination(
  raw: string | null | undefined
): TrafficDestination {
  const t = (raw ?? "").trim();
  const mapping: Record<string, TrafficDestination> = {
    vk_community: "vk_subscribe",
    community_subscribe: "vk_subscribe",
    lead_magnet: "quiz",
    vk_lead: "vk_lead_form",
    vk_lead_form: "vk_lead_form",
    site: "site",
    community_messages: "community_messages",
  };

  if (!t) return "vk_subscribe";
  if (t in mapping) return mapping[t];
  if (TRAFFIC_SET.has(t)) return t as TrafficDestination;
  return "vk_subscribe";
}

export function trafficDestinationLabel(
  value: string | null | undefined
): string {
  const normalized = normalizeTrafficDestination(value);
  return (
    TRAFFIC_DESTINATION_OPTIONS.find((o) => o.value === normalized)?.label ??
    "—"
  );
}
