import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import { CampaignCreateForm } from "@/components/campaign-create-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProject } from "@/lib/supabase/queries";
import {
  type ProjectAnalysis,
  toProjectAnalysis,
  withStableSegmentIds,
} from "@/lib/types/project-analysis";

type PageProps = { params: Promise<{ id: string }> };

export default async function NewCampaignPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const ready = project.analysis_status === "ready";
  const analysis = project.analysis
    ? withStableSegmentIds(
        toProjectAnalysis(project.analysis) ??
          (project.analysis as ProjectAnalysis)
      )
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">
          Проекты
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
        <Link
          href={`/projects/${id}`}
          className="max-w-[40vw] truncate hover:text-foreground"
        >
          {project.name}
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
        <span className="text-foreground">Новая кампания</span>
      </nav>

      {!ready || !analysis ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Сначала проанализируйте ЦА на уровне проекта.
          </p>
          <Link
            href={`/projects/${id}`}
            className={cn(buttonVariants({ variant: "default", size: "default" }))}
          >
            К проекту
          </Link>
        </div>
      ) : (
        <CampaignCreateForm projectId={id} analysis={analysis} />
      )}
    </div>
  );
}
