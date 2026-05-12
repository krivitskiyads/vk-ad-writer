"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import {
  FileDropZone,
  FileListItem,
  type ParsedFile,
} from "@/components/file-drop-zone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectFile } from "@/lib/types/project-files";

type Props = {
  projectId: string;
  initialFiles: ProjectFile[];
};

export function ProjectMaterialsSection({ projectId, initialFiles }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const uploadParsed = async (parsed: ParsedFile[]) => {
    const created: ProjectFile[] = [];
    let hadVisionPdf = false;
    for (const f of parsed) {
      try {
        const res = await fetch(`/api/projects/${projectId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.name,
            content: f.content,
            file_type: f.file_type,
            size_bytes: f.size_bytes,
            kind: "material",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(`«${f.name}»: ${data.error ?? `ошибка ${res.status}`}`);
          continue;
        }
        const { file } = (await res.json()) as { file: ProjectFile };
        created.push(file);
        if (f.file_type === "pdf" && f.pdfExtractionMethod === "vision") {
          hadVisionPdf = true;
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ошибка загрузки";
        toast.error(`«${f.name}»: ${message}`);
      }
    }
    if (created.length > 0) {
      setFiles((prev) => [...prev, ...created]);
      const sole = created.length === 1 ? created[0] : null;
      const soleParsed = sole
        ? parsed.find((p) => p.name === sole.name)
        : undefined;
      const singlePdfParse =
        soleParsed?.file_type === "pdf" &&
        soleParsed.pdfExtractionMethod === "pdf-parse";

      if (hadVisionPdf) {
        toast.success("AI распознал текст из PDF", {
          className:
            "bg-emerald-50 text-emerald-950 border border-emerald-200 [&_[data-description]]:text-emerald-800",
          description:
            created.length > 1 ? `Всего добавлено файлов: ${created.length}` : undefined,
        });
      } else if (created.length === 1 && singlePdfParse) {
        toast.success("PDF загружен");
      } else {
        toast.success(`Добавлено файлов: ${created.length}`);
      }
      router.refresh();
    }
  };

  const removeFile = async (fileId: string) => {
    setRemovingId(fileId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${fileId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось удалить файл");
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка удаления";
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-[#7c3aed]" aria-hidden />
          Материалы клиента
        </CardTitle>
        <CardDescription>
          Брифы, прайсы, удачные посты и любые другие документы. Используются для
          анализа ЦА и подсказок копирайтеру.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((f) => (
              <FileListItem
                key={f.id}
                file={f}
                removing={removingId === f.id}
                onRemove={() => removeFile(f.id)}
              />
            ))}
          </ul>
        )}
        <FileDropZone
          projectId={projectId}
          onFilesParsed={uploadParsed}
          hint={
            files.length === 0
              ? "Перетащите сюда первые материалы клиента. Поддерживаются PDF, DOCX, TXT, CSV."
              : "Добавить ещё файлы"
          }
        />
      </CardContent>
    </Card>
  );
}
