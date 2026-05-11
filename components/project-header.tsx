"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  initialName: string;
  description: string | null;
  admin?: {
    total_cost_rub: number;
    request_count: number;
  } | null;
  workspaceProjectsHref: string;
};

export function ProjectHeader({
  projectId,
  initialName,
  description,
  admin,
  workspaceProjectsHref,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const cancelEdit = () => {
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
      const res = await fetch(`/api/projects/${projectId}`, {
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось удалить проект");
      }
      toast.success("Проект удалён");
      setDeleteOpen(false);
      router.push(workspaceProjectsHref);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка удаления";
      toast.error(message);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href={workspaceProjectsHref}
          className="transition-colors hover:text-foreground"
        >
          Проекты
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-foreground truncate">{name}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={saving}
                className={cn(
                  "h-10 text-2xl font-semibold tracking-[-0.01em]",
                  "max-w-xl"
                )}
              />
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving}
                aria-label="Сохранить"
                className="flex size-9 items-center justify-center rounded-md text-[#7c3aed] hover:bg-[#7c3aed]/10 disabled:opacity-50"
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
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="group inline-flex items-center gap-2">
              <h1 className="notion-page-title">{name}</h1>
              <button
                type="button"
                onClick={() => {
                  setDraft(name);
                  setEditing(true);
                }}
                aria-label="Переименовать"
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {admin && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                💰 {admin.total_cost_rub.toFixed(2)} ₽
              </div>
              <div>⚡ {admin.request_count} запросов</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Удалить проект
          </button>
        </div>
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => !deleting && setDeleteOpen(v)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить проект «{name}»?</DialogTitle>
            <DialogDescription>
              Будут безвозвратно удалены: все материалы, анализ ЦА, кампании и
              сгенерированные тексты.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
