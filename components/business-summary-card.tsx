import type { ProjectAnalysis } from "@/lib/types/project-analysis";
import { Card } from "@/components/ui/card";
import type React from "react";

type Props = {
  business: ProjectAnalysis["business"];
  positioning?: ProjectAnalysis["positioning"];
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm leading-snug text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function listOrDash(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export function BusinessSummaryCard({ business }: Props) {
  const usp = listOrDash(business.usp);
  return (
    <Card className="rounded-lg border border-gray-200 p-4">
      <div className="text-lg font-semibold">О бизнесе</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3">
        <Field label="Ниша" value={(business.niche ?? "").trim() || "—"} />
        <Field label="Категория" value={(business.niche_category ?? "").trim() || "—"} />
        <Field label="Гео" value={(business.geo ?? "").trim() || "—"} />
        <Field
          label="Тип бизнеса"
          value={(business.business_type ?? "").trim() || "—"}
        />
        <div className="md:col-span-2">
          <Field label="Средний чек" value={(business.average_check ?? "").trim() || "—"} />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-sm font-semibold text-gray-900 mb-2">УТП</div>
        {usp.length > 0 ? (
          <ul className="mt-2 list-disc list-inside text-sm text-gray-900 space-y-1">
            {usp.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500 mt-2">—</div>
        )}
      </div>

      <p className="mt-3 text-sm text-gray-900">
        {(business.description_summary ?? "").trim() || "—"}
      </p>
    </Card>
  );
}

