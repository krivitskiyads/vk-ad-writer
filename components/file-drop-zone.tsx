"use client";

import { useCallback, useRef, useState } from "react";
import { ClipboardPaste, FileText, Loader2, Upload, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ParsedFile = {
  name: string;
  content: string;
  file_type: string | null;
  size_bytes: number;
  /** Заполняется для PDF при загрузке через endpoint проекта. */
  pdfExtractionMethod?: "pdf-parse" | "vision";
};

type FileDropZoneProps = {
  onFilesParsed: (files: ParsedFile[]) => void | Promise<void>;
  className?: string;
  /** Текст-инструкция в зоне. */
  hint?: string;
  /** Если true — компонент сам не управляет своим списком, только сообщает наверх. */
  multiple?: boolean;
  /** Подпись CTA в диалоге вставки текста (default: "Добавить материал"). */
  pasteSubmitLabel?: string;
  /** Нужен для гибридного извлечения текста из PDF на сервере. */
  projectId?: string;
};

const SUPPORTED_EXTS = ["pdf", "docx", "txt", "csv", "md"] as const;

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

async function parseFile(
  file: File,
  projectId?: string
): Promise<ParsedFile> {
  const ext = getExt(file.name);

  if (ext === "pdf") {
    const fd = new FormData();
    fd.append("file", file);
    const url = projectId
      ? `/api/projects/${projectId}/extract-pdf`
      : "/api/extract-pdf";
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `PDF: ошибка ${res.status}`);
    }
    const data = (await res.json()) as {
      text?: string;
      method?: "pdf-parse" | "vision";
    };
    return {
      name: file.name,
      content: (data.text ?? "").trim(),
      file_type: "pdf",
      size_bytes: file.size,
      pdfExtractionMethod: data.method,
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
  pasteSubmitLabel = "Добавить материал",
  projectId,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Читаем файлы…");
  const [pasteOpen, setPasteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const hasPdf = files.some((f) => getExt(f.name) === "pdf");
      setBusy(true);
      let aiHintTimer: ReturnType<typeof setTimeout> | undefined;
      if (hasPdf) {
        setBusyLabel("Извлекаем текст из PDF…");
        aiHintTimer = setTimeout(() => {
          setBusyLabel("Распознаём текст с помощью AI…");
        }, 4000);
      } else {
        setBusyLabel("Читаем файлы…");
      }

      const parsed: ParsedFile[] = [];
      try {
        for (const file of files) {
          try {
            const result = await parseFile(file, projectId);
            parsed.push(result);
          } catch (e) {
            const message =
              e instanceof Error ? e.message : "Не удалось обработать файл";
            toast.error(message);
          }
        }
        if (parsed.length > 0) {
          try {
            await onFilesParsed(parsed);
          } catch (e) {
            const message =
              e instanceof Error ? e.message : "Не удалось добавить файлы";
            toast.error(message);
          }
        }
      } finally {
        if (aiHintTimer) clearTimeout(aiHintTimer);
        setBusyLabel("Читаем файлы…");
        setBusy(false);
      }
    },
    [onFilesParsed, projectId]
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

  const handleTextSubmit = async (name: string, content: string) => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (!trimmedName || !trimmedContent) {
      toast.error("Заполните название и текст материала");
      return;
    }
    setPasteOpen(false);
    const parsed: ParsedFile = {
      name: trimmedName,
      content: trimmedContent,
      file_type: "text/plain",
      size_bytes: trimmedContent.length,
    };
    try {
      await onFilesParsed([parsed]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось добавить материал";
      toast.error(message);
    }
  };

  return (
    <>
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
            <span className="text-sm">{busyLabel}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="size-7 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground max-w-md">
              {hint ??
                "Перетащите сюда материалы клиента — брифы, прайсы, удачные посты, ссылки на сайт. Поддерживаются PDF, DOCX, TXT, CSV."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPickClick}
              >
                Выбрать файлы
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setPasteOpen(true)}
              >
                <ClipboardPaste className="size-3.5" aria-hidden />
                Вставить текст
              </Button>
            </div>
          </div>
        )}
      </div>

      <PasteTextDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        onSubmit={handleTextSubmit}
        submitLabel={pasteSubmitLabel}
      />
    </>
  );
}

function PasteTextDialog({
  open,
  onOpenChange,
  onSubmit,
  submitLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (name: string, content: string) => void | Promise<void>;
  submitLabel: string;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setContent("");
    setBusy(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(name, content);
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-[#7c3aed]" aria-hidden />
            Вставить текст-материал
          </DialogTitle>
          <DialogDescription>
            Удобно для брифов, цитат и фрагментов с сайта, когда нет отдельного
            файла.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="paste-name">Название</Label>
            <Input
              id="paste-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Описание ниши клиента"
              disabled={busy}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paste-content">Текст</Label>
            <Textarea
              id="paste-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Вставьте текст материала: бриф, описание, цитаты, что угодно"
              disabled={busy}
              rows={10}
              className="min-h-[200px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={busy}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !name.trim() || !content.trim()}
            className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type FileListItemFile = {
  id?: string;
  name: string;
  size_bytes?: number | null;
  file_type?: string | null;
};

const FILE_EXTENSIONS = ["pdf", "docx", "doc", "txt", "csv", "md"] as const;

function isTextMaterial(file: FileListItemFile): boolean {
  if (file.file_type === "text/plain") {
    const dot = file.name.lastIndexOf(".");
    if (dot < 0) return true;
    const ext = file.name.slice(dot + 1).toLowerCase();
    return !FILE_EXTENSIONS.includes(ext as (typeof FILE_EXTENSIONS)[number]);
  }
  return false;
}

export function FileListItem({
  file,
  onRemove,
  removing,
}: {
  file: FileListItemFile;
  onRemove?: () => void;
  removing?: boolean;
}) {
  const isText = isTextMaterial(file);
  const sizeKb =
    typeof file.size_bytes === "number" && file.size_bytes > 0
      ? Math.max(1, Math.round(file.size_bytes / 1024))
      : null;
  const typeLabel = isText
    ? "текст"
    : file.file_type && file.file_type !== "text/plain"
      ? file.file_type
      : null;
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <FileText
          className={cn(
            "size-4 shrink-0",
            isText ? "text-[#7c3aed]" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <span className="truncate font-medium">{file.name}</span>
        {typeLabel && (
          <span className="shrink-0 text-xs uppercase text-muted-foreground">
            {typeLabel}
          </span>
        )}
        {sizeKb !== null && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {sizeKb} КБ
          </span>
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
