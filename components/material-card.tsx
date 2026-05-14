"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import { formatRelativeCreatedAt } from "@/lib/format-relative-time";
import {
  MATERIAL_TAG_LABELS,
  MATERIAL_TAG_PILL_CLASS,
  type WorkspaceMaterialWithAuthor,
} from "@/lib/types/workspace-materials";
import { cn } from "@/lib/utils";

type Props = {
  material: WorkspaceMaterialWithAuthor;
  workspaceSlug: string;
  onRemoved: (id: string) => void;
};

export function MaterialCard({ material, workspaceSlug, onRemoved }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const ext = material.file_extension.toLowerCase();
  const authorLine =
    material.author?.email ?? "участник workspace";

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceSlug)}/materials/${encodeURIComponent(material.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        let msg = "Не удалось удалить";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      onRemoved(material.id);
      setConfirmOpen(false);
    } catch (e) {
      console.error("[MaterialCard] delete", e);
      toast.error(e instanceof Error ? e.message : "Не удалось удалить");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <article
        className={cn(
          "relative flex h-full flex-col rounded-xl border border-violet-100 bg-white p-4 shadow-sm",
          "transition-shadow hover:shadow-md"
        )}
      >
        <div className="absolute top-2 right-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Удалить материал"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <div className="pr-10">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <h3 className="text-base font-semibold leading-snug text-foreground">
              {material.name}
            </h3>
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              .{ext}
            </span>
          </div>
          {material.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {material.description}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex max-w-full rounded-full px-2.5 py-0.5 text-xs font-medium",
              MATERIAL_TAG_PILL_CLASS[material.tag]
            )}
          >
            {MATERIAL_TAG_LABELS[material.tag]}
          </span>
        </div>

        <p className="mt-auto pt-4 text-xs text-muted-foreground">
          Загрузил {authorLine} · {formatRelativeCreatedAt(material.created_at)}
        </p>
      </article>

      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!deleting}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Удаление</DialogTitle>
            <DialogDescription>
              Удалить материал &apos;{material.name}&apos;? Это действие нельзя
              отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setConfirmOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Удаляем…
                </>
              ) : (
                "Удалить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
