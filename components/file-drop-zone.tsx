"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ParsedFile = {
  name: string;
  content: string;
  file_type: string | null;
  size_bytes: number;
};

type FileDropZoneProps = {
  onFilesParsed: (files: ParsedFile[]) => void | Promise<void>;
  className?: string;
  /** Текст-инструкция в зоне. */
  hint?: string;
  /** Если true — компонент сам не управляет своим списком, только сообщает наверх. */
  multiple?: boolean;
};

const SUPPORTED_EXTS = ["pdf", "docx", "txt", "csv", "md"] as const;

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

async function parseFile(file: File): Promise<ParsedFile> {
  const ext = getExt(file.name);

  if (ext === "pdf") {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `PDF: ошибка ${res.status}`);
    }
    const data = (await res.json()) as { text?: string };
    return {
      name: file.name,
      content: (data.text ?? "").trim(),
      file_type: "pdf",
      size_bytes: file.size,
    };
  }

  if (ext === "docx") {
    const buffer = await file.arrayBuffer();
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
    return {
      name: file.name,
      content: (value ?? "").trim(),
      file_type: "docx",
      size_bytes: file.size,
    };
  }

  if (ext === "txt" || ext === "csv" || ext === "md") {
    const text = await file.text();
    return {
      name: file.name,
      content: text.trim(),
      file_type: ext,
      size_bytes: file.size,
    };
  }

  throw new Error(
    `${file.name}: неподдерживаемый формат. Допустимы: ${SUPPORTED_EXTS.join(", ")}`
  );
}

export function FileDropZone({
  onFilesParsed,
  className,
  hint,
  multiple = true,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      setBusy(true);
      const parsed: ParsedFile[] = [];
      for (const file of files) {
        try {
          const result = await parseFile(file);
          parsed.push(result);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Не удалось обработать файл";
          toast.error(message);
        }
      }
      if (parsed.length > 0) {
        try {
          await onFilesParsed(parsed);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Не удалось добавить файлы";
          toast.error(message);
        }
      }
      setBusy(false);
    },
    [onFilesParsed]
  );

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setDragActive(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (busy) return;
    if (e.dataTransfer.files?.length) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const onPickClick = () => {
    inputRef.current?.click();
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files?.length) {
      void handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
        dragActive
          ? "border-[#7c3aed] bg-[#7c3aed]/5"
          : "border-border bg-muted/30",
        busy && "opacity-70 pointer-events-none",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.csv,.md"
        multiple={multiple}
        className="sr-only"
        onChange={onChange}
      />
      {busy ? (
        <div className="flex flex-col items-center gap-2 py-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" aria-hidden />
          <span className="text-sm">Читаем файлы…</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <Upload className="size-7 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground max-w-md">
            {hint ??
              "Перетащите сюда материалы клиента — брифы, прайсы, удачные посты, ссылки на сайт. Поддерживаются PDF, DOCX, TXT, CSV."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onPickClick}>
            Выбрать файлы
          </Button>
        </div>
      )}
    </div>
  );
}

type FileListItemFile = {
  id?: string;
  name: string;
  size_bytes?: number | null;
  file_type?: string | null;
};

export function FileListItem({
  file,
  onRemove,
  removing,
}: {
  file: FileListItemFile;
  onRemove?: () => void;
  removing?: boolean;
}) {
  const sizeKb =
    typeof file.size_bytes === "number" && file.size_bytes > 0
      ? Math.max(1, Math.round(file.size_bytes / 1024))
      : null;
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate font-medium">{file.name}</span>
        {file.file_type && (
          <span className="text-xs uppercase text-muted-foreground">
            {file.file_type}
          </span>
        )}
        {sizeKb !== null && (
          <span className="text-xs text-muted-foreground">{sizeKb} КБ</span>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label="Удалить"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {removing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <X className="size-4" aria-hidden />
          )}
        </button>
      )}
    </li>
  );
}
