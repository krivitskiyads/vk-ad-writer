type Props = {
  priority: "high" | "medium" | "low";
};

const map = {
  high: { label: "Высокий", className: "bg-violet-600 text-white" },
  medium: { label: "Средний", className: "bg-gray-200 text-gray-700" },
  low: { label: "Низкий", className: "bg-gray-100 text-gray-500" },
} as const;

export function PriorityPill({ priority }: Props) {
  const p = map[priority];
  return (
    <span
      className={[
        "text-xs font-medium px-3 py-1 rounded-md whitespace-nowrap",
        p.className,
      ].join(" ")}
    >
      {p.label}
    </span>
  );
}

