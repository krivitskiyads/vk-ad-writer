"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { FileDropZone, FileListItem, type ParsedFile } from "@/components/file-drop-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Mode = "create_only" | "create_and_analyze";

export function ProjectCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [stage, setStage] = useState<"idle" | "creating" | "uploading" | "analyzing">(
    "idle"
  );

  const busy = stage !== "idle";

  const handleFilesParsed = (parsed: ParsedFile[]) => {
    setFiles((prev) => [...prev, ...parsed]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (selectedMode: Mode) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Укажите имя проекта");
      return;
    }
    setMode(selectedMode);
    setStage("creating");
    try {
      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
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

      if (files.length > 0) {
        setStage("uploading");
        for (const file of files) {
          const upRes = await fetch(`/api/projects/${projectId}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              content: file.content,
              file_type: file.file_type,
              size_bytes: file.size_bytes,
            }),
          });
          if (!upRes.ok) {
            const data = await upRes.json().catch(() => ({}));
            toast.error(`Не удалось сохранить файл «${file.name}»: ${data.error ?? upRes.status}`);
          }
        }
      }

      if (selectedMode === "create_and_analyze") {
        setStage("analyzing");
        // Анализ запускаем "fire-and-forget": ответ может занять минуту,
        // пользователь увидит прогресс на странице проекта.
        void fetch(`/api/projects/${projectId}/analyze`, { method: "POST" }).catch(
          (e) => console.error("[create-form] analyze fire-and-forget failed", e)
        );
      }

      toast.success(
        selectedMode === "create_and_analyze"
          ? "Проект создан, запускаем анализ"
          : "Проект создан"
      );
      router.push(`/projects/${projectId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Что-то пошло не так";
      toast.error(message);
      setStage("idle");
      setMode(null);
    }
  };

  const stageLabel: Record<typeof stage, string> = {
    idle: "",
    creating: "Создаём проект…",
    uploading: "Загружаем материалы…",
    analyzing: "Запускаем анализ…",
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

        <div className="space-y-2">
          <Label>Материалы клиента</Label>
          <FileDropZone onFilesParsed={handleFilesParsed} />
          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((file, i) => (
                <FileListItem
                  key={`${file.name}-${i}`}
                  file={file}
                  onRemove={busy ? undefined : () => removeFile(i)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
        {busy && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground sm:mr-auto">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {stageLabel[stage]}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={busy || !name.trim()}
          onClick={() => submit("create_only")}
        >
          {busy && mode === "create_only" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Создать без анализа
        </Button>
        <Button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => submit("create_and_analyze")}
          className="bg-[#7c3aed] text-white hover:bg-[#6d28d9] gap-2"
        >
          {busy && mode === "create_and_analyze" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          Создать и проанализировать
        </Button>
      </div>
    </div>
  );
}
