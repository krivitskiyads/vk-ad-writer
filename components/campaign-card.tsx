"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Campaign, CampaignStatus } from "@/lib/types/campaign";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  campaign: Campaign;
  batchCount: number;
};

function formatRelativeRu(iso: string | null): string {
  if (!iso) return "недавно";
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

function pluralRuns(n: number): string {
  const last = n % 100;
  if (last >= 11 && last <= 14) return `${n} прогонов`;
  const d = n % 10;
  if (d === 1) return `${n} прогон`;
  if (d >= 2 && d <= 4) return `${n} прогона`;
  return `${n} прогонов`;
}

function statusLabel(status: CampaignStatus): string | null {
  if (status === "draft") return null;
  if (status === "active") return "Активна";
  return "В архиве";
}

export function CampaignCard({ projectId, campaign, batchCount }: Props) {
  const router = useRouter();
  const [name, setName] = useState(campaign.name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(campaign.name);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(campaign.name);
    setDraft(campaign.name);
  }, [campaign.name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const href = `/projects/${projectId}/campaigns/${campaign.id}/upload`;
  const badge = statusLabel(campaign.status);

  const startEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(name);
    setEditing(true);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(false);
    setDraft(name);
  };

  const saveEdit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Имя не может быть пустым");
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      setName(trimmed);
      setEditing(false);
      toast.success("Название обновлено");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось удалить");
      }
      toast.success("Кампания удалена");
      setDeleteOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Link
        href={href}
        className={cn(
          "group relative block rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors",
          "hover:border-[#7c3aed]/40 hover:bg-muted/30"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            {editing ? (
              <div
                className="flex flex-wrap items-center gap-2"
                onClick={(e) => e.preventDefault()}
              >
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveEdit();
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditing(false);
                      setDraft(name);
                    }
                  }}
                  className="h-8 max-w-full min-w-[8rem] flex-1"
                  disabled={saving}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={(e) => void saveEdit(e)}
                  disabled={saving}
                  aria-label="Сохранить"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="size-4" aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={cancelEdit}
                  disabled={saving}
                  aria-label="Отмена"
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold text-foreground">{name}</h3>
                {badge && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {badge}
                  </span>
                )}
              </div>
            )}
            {campaign.description && !editing && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {campaign.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {pluralRuns(batchCount)} · обновлена{" "}
              {formatRelativeRu(campaign.updated_at)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              onClick={startEdit}
              aria-label="Переименовать"
            >
              <Pencil className="size-3.5" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteOpen(true);
              }}
              aria-label="Удалить кампанию"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      </Link>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Удалить кампанию?</DialogTitle>
            <DialogDescription>
              Кампания «{name}» и связанные с ней материалы и тексты будут удалены
              безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void onDelete()}
              disabled={deleting}
            >
              {deleting && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
