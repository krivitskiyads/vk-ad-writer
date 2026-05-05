"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Briefcase, Check, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProjectCardProject = {
  project_id: string;
  name: string;
  campaign_count: number;
  request_count: number;
  total_cost_rub: number;
  last_activity_at: string | null;
};

type Props = {
  project: ProjectCardProject;
  isAdmin: boolean;
};

function formatRelativeRu(iso: string | null): string {
  if (!iso) return "ещё нет активности";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "недавно";
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} дн назад`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} нед назад`;
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function pluralCampaigns(n: number): string {
  const last = n % 100;
  if (last >= 11 && last <= 14) return `${n} кампаний`;
  const lastDigit = n % 10;
  if (lastDigit === 1) return `${n} кампания`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${n} кампании`;
  return `${n} кампаний`;
}

export function ProjectCard({ project, isAdmin }: Props) {
  const [name, setName] = useState(project.name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(name);
    setEditing(true);
  };

  const cancelEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditing(false);
    setDraft(name);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Имя проекта не может быть пустым");
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.project_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить имя");
      }
      setName(trimmed);
      setEditing(false);
      toast.success("Имя обновлено");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка сохранения";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <Link
      href={editing ? "#" : `/projects/${project.project_id}`}
      onClick={(e) => {
        if (editing) e.preventDefault();
      }}
      aria-disabled={editing}
      className={cn(
        "group relative block rounded-xl border border-border bg-card p-5 transition-all",
        "hover:border-[#7c3aed]/60 hover:shadow-md hover:shadow-[#7c3aed]/5",
        editing && "ring-2 ring-[#7c3aed]/40 cursor-default"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#7c3aed]">
          <Briefcase className="size-4" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={saving}
                className="h-8 text-base font-semibold"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void saveEdit();
                }}
                disabled={saving}
                aria-label="Сохранить"
                className="flex size-8 items-center justify-center rounded-md text-[#7c3aed] hover:bg-[#7c3aed]/10 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-4" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                aria-label="Отмена"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-1.5">
              <h2 className="min-w-0 flex-1 truncate text-base font-semibold leading-snug">
                {name}
              </h2>
              <button
                type="button"
                onClick={startEdit}
                aria-label="Переименовать"
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            </div>
          )}

          <p className="mt-1 text-xs text-muted-foreground">
            {pluralCampaigns(project.campaign_count)} ·{" "}
            {project.last_activity_at
              ? `обновлён ${formatRelativeRu(project.last_activity_at)}`
              : "ещё не использовался"}
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>💰</span>
            {project.total_cost_rub.toFixed(2)} ₽
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>⚡</span>
            {project.request_count} запросов
          </span>
        </div>
      )}
    </Link>
  );
}
