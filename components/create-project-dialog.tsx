"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createProject } from "@/lib/supabase/queries";

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const project = await createProject(trimmed);
      setOpen(false);
      setName("");
      const projectId = (project as { id: string } | null)?.id;
      if (!projectId) throw new Error("Не удалось получить ID проекта");
      router.push(`/project/${projectId}/upload`);
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Не удалось создать проект";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        Создать проект
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setName("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Новый проект</DialogTitle>
              <DialogDescription>
                Укажите название — после создания откроется загрузка материалов.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <label htmlFor="project-name" className="text-sm font-medium">
                Название проекта
              </label>
              <Input
                id="project-name"
                name="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Реклама курса весна 2026"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={!name.trim() || submitting}>
                {submitting ? "Создаём…" : "Создать"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
