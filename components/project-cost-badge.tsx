import type { ProjectUsageSummary } from "@/lib/types/project-usage";

interface Props {
  usage: ProjectUsageSummary | null | undefined;
}

function pluralizeRequests(n: number): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "запросов";
  if (last === 1) return "запрос";
  if (last >= 2 && last <= 4) return "запроса";
  return "запросов";
}

export function ProjectCostBadge({ usage }: Props) {
  if (!usage || usage.total_requests === 0) {
    return <div className="text-muted-foreground text-xs">Нет запросов</div>;
  }

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <span>
        💰 ${usage.total_cost_usd.toFixed(4)} / {usage.total_cost_rub.toFixed(2)}{" "}
        ₽
      </span>
      <span>·</span>
      <span>
        ⚡ {usage.total_requests} {pluralizeRequests(usage.total_requests)}
      </span>
    </div>
  );
}
