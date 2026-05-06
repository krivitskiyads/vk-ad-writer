"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import {
  FileDropZone,
  FileListItem,
  type ParsedFile,
} from "@/components/file-drop-zone";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CampaignFile } from "@/lib/types/campaign-files";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  campaignId: string;
  initialFiles: CampaignFile[];
};

export function CampaignUploadSection({
  projectId,
  campaignId,
  initialFiles,
}: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<CampaignFile[]>(initialFiles);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const uploadParsed = async (parsed: ParsedFile[]) => {
    const created: CampaignFile[] = [];
    for (const f of parsed) {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.name,
            content: f.content,
            file_type: f.file_type,
            size_bytes: f.size_bytes,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(`«${f.name}»: ${data.error ?? `ошибка ${res.status}`}`);
          continue;
        }
        const { file } = (await res.json()) as { file: CampaignFile };
        created.push(file);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ошибка загрузки";
        toast.error(`«${f.name}»: ${message}`);
      }
    }
    if (created.length > 0) {
      setFiles((prev) => [...prev, ...created]);
      toast.success(`Добавлено файлов: ${created.length}`);
      router.refresh();
    }
  };

  const removeFile = async (fileId: string) => {
    setRemovingId(fileId);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/files/${fileId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось удалить файл");
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setRemovingId(null);
    }
  };

  const nextHref = `/projects/${projectId}/campaigns/${campaignId}/analysis`;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-[#7c3aed]" aria-hidden />
          Материалы кампании
        </CardTitle>
        <CardDescription>
          Опционально — добавьте материалы, специфичные именно для этой кампании.
          Например, бриф на распродажу, лендинг акции, описание оффера. Базовые
          материалы клиента уже подгружаются из проекта.
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
          onFilesParsed={uploadParsed}
          pasteSubmitLabel="Добавить в кампанию"
          hint={
            files.length === 0
              ? "Перетащите файлы или вставьте текст — PDF, DOCX, TXT, CSV."
              : "Добавить ещё файлы"
          }
        />
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {files.length === 0 && (
            <span className="mr-auto text-xs text-muted-foreground">
              Можно пропустить, если материалов нет
            </span>
          )}
          <Link
            href={nextHref}
            className={cn(
              buttonVariants({ variant: "default", size: "default" })
            )}
          >
            Дальше
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
