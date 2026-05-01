"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteProject, getProjects } from "@/lib/supabase/queries";

type ProjectRow = {
  id: string;
  name: string;
  status?: string | null;
  updated_at?: string | null;
};

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "analyzed":
      return "Проанализирован";
    case "configured":
      return "Настроен";
    case "done":
      return "Готово";
    case "draft":
    default:
      return "Черновик";
  }
}

function statusBadgeVariant(
  status: string | null | undefined
): "default" | "secondary" | "outline" {
  switch (status) {
    case "done":
      return "default";
    case "analyzed":
    case "configured":
      return "secondary";
    case "draft":
    default:
      return "outline";
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function nextStepHref(
  id: string,
  status: string | null | undefined
): string {
  switch (status) {
    case "done":
      return `/project/${id}/texts`;
    case "configured":
      return `/project/${id}/texts`;
    case "analyzed":
      return `/project/${id}/configure`;
    case "draft":
    default:
      return `/project/${id}/upload`;
  }
}

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getProjects();
        if (cancelled) return;
        setProjects((data as ProjectRow[]) ?? []);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Ошибка загрузки проектов";
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string, name: string) {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Удалить проект «${name}»? Действие нельзя отменить.`
      );
      if (!ok) return;
    }
    setPendingDeleteId(id);
    try {
      await deleteProject(id);
      setProjects((prev) => (prev ?? []).filter((p) => p.id !== id));
      toast.success("Проект удалён");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось удалить проект";
      toast.error(msg);
    } finally {
      setPendingDeleteId(null);
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        Загружаем проекты…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive py-12 text-center text-sm">{error}</p>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        Пока нет проектов. Нажмите «Создать проект», чтобы начать.
      </p>
    );
  }

  return (
    <ul className="divide-border divide-y rounded-lg border">
      {projects.map((p) => {
        const href = nextStepHref(p.id, p.status);
        const isDeleting = pendingDeleteId === p.id;
        return (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={href}
                className="truncate text-sm font-medium hover:underline"
              >
                {p.name}
              </Link>
              {p.updated_at && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Обновлён: {formatDate(p.updated_at)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={statusBadgeVariant(p.status)}>
                {statusLabel(p.status)}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => void handleDelete(p.id, p.name)}
                disabled={isDeleting}
                aria-label={`Удалить ${p.name}`}
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
