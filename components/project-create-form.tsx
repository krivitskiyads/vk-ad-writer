"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceOptional } from "@/components/workspace-context";

export function ProjectCreateForm() {
  const router = useRouter();
  const workspace = useWorkspaceOptional();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Укажите имя проекта");
      return;
    }
    if (!workspace) {
      toast.error("Не выбран workspace");
      return;
    }
    setBusy(true);
    try {
      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          workspaceId: workspace.id,
        }),
      });
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось создать проект");
      }
      const { project } = (await createRes.json()) as {
        project: { id: string };
      };
      const projectId = project.id;
      toast.success("Проект создан");
      router.push(`/w/${workspace.slug}/projects/${projectId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Что-то пошло не так";
      toast.error(message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="project-name">Имя проекта</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Школа английского Иванова"
            disabled={busy}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-description">Описание</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание клиента: ниша, целевая аудитория, особенности"
            disabled={busy}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">Опционально</p>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <Button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void submit()}
          className="bg-[#7c3aed] text-white hover:bg-[#6d28d9] w-full sm:w-auto"
        >
          Создать проект
        </Button>
        <p className="text-xs text-muted-foreground">
          После создания загрузите материалы клиента и запустите анализ ЦА прямо на странице проекта.
        </p>
      </div>
    </div>
  );
}
