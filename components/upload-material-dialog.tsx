"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  MATERIAL_TAG_LABELS,
  MATERIAL_TAGS,
  type MaterialTag,
  type WorkspaceMaterial,
  type WorkspaceMaterialWithAuthor,
} from "@/lib/types/workspace-materials";
import { cn } from "@/lib/utils";

const TAG_AUTO = "__auto__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  onUploaded: (material: WorkspaceMaterialWithAuthor) => void;
};

export function UploadMaterialDialog({
  open,
  onOpenChange,
  workspaceSlug,
  onUploaded,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagChoice, setTagChoice] = useState<string>(TAG_AUTO);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [longWait, setLongWait] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const hasFile = file !== null;
  const hasText = pastedText.trim().length > 0;
  const canSubmit = (hasFile || hasText) && !submitting;

  const resetForm = useCallback(() => {
    setFile(null);
    setPastedText("");
    setName("");
    setDescription("");
    setTagChoice(TAG_AUTO);
    setDragOver(false);
    setErrorBanner(null);
    setLongWait(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!submitting || tagChoice !== TAG_AUTO) {
      setLongWait(false);
      return;
    }
    const t = window.setTimeout(() => setLongWait(true), 1000);
    return () => window.clearTimeout(t);
  }, [submitting, tagChoice]);

  function pickFile(f: File | null) {
    setFile(f);
    if (f) setPastedText("");
  }

  function onTextChange(v: string) {
    setPastedText(v);
    if (v.trim()) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit() {
    if (!hasFile && !hasText) return;
    setSubmitting(true);
    setErrorBanner(null);
    try {
      const fd = new FormData();
      if (hasFile && file) fd.append("file", file);
      if (hasText) fd.append("text_content", pastedText.trim());
      const nameTrim = name.trim();
      if (nameTrim) fd.append("name", nameTrim);
      const descTrim = description.trim();
      if (descTrim) fd.append("description", descTrim);
      if (tagChoice !== TAG_AUTO) fd.append("tag", tagChoice);

      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceSlug)}/materials`,
        { method: "POST", body: fd }
      );

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        material?: WorkspaceMaterial;
      };

      if (!res.ok || !json.material) {
        const msg = json.error ?? "Не удалось загрузить материал";
        setErrorBanner(msg);
        toast.error(msg);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const withAuthor: WorkspaceMaterialWithAuthor = {
        ...json.material,
        author: user?.email
          ? { id: json.material.created_by, email: user.email }
          : null,
      };

      onUploaded(withAuthor);
      toast.success("Материал добавлен");
      onOpenChange(false);
      resetForm();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Не удалось загрузить материал";
      setErrorBanner(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel =
    submitting && tagChoice === TAG_AUTO && longWait
      ? "Определяем тип…"
      : submitting
        ? "Загружаем…"
        : "Загрузить";

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Загрузить материал</DialogTitle>
          <DialogDescription>
            Файл PDF, CSV или TXT — или вставьте текст вручную. Материал будет
            доступен во всех проектах этого workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {errorBanner ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorBanner}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Файл</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
              className="sr-only"
              tabIndex={-1}
              disabled={hasText || submitting}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                pickFile(f);
              }}
            />
            <button
              type="button"
              disabled={hasText || submitting}
              onDragOver={(e) => {
                e.preventDefault();
                if (!hasText) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (hasText || submitting) return;
                const f = e.dataTransfer.files?.[0];
                if (f) pickFile(f);
              }}
              onClick={() => !hasText && fileInputRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm transition-colors",
                hasText || submitting
                  ? "cursor-not-allowed border-muted bg-muted/30 text-muted-foreground"
                  : dragOver
                    ? "border-violet-500 bg-violet-50 text-violet-900"
                    : "border-violet-200 bg-violet-50/50 text-muted-foreground hover:border-violet-400 hover:bg-violet-50"
              )}
            >
              <Upload className="size-8 text-violet-500" aria-hidden />
              <span>
                {file
                  ? file.name
                  : "Перетащите файл сюда или нажмите для выбора"}
              </span>
              <span className="text-xs text-muted-foreground">
                .pdf, .csv, .txt
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-paste">Вставить текст вручную</Label>
            <Textarea
              id="material-paste"
              rows={5}
              placeholder="Вставьте текст материала…"
              value={pastedText}
              disabled={hasFile || submitting}
              onChange={(e) => onTextChange(e.target.value)}
              className="min-h-[120px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-name">Название</Label>
            <Input
              id="material-name"
              placeholder="Возьмётся из имени файла"
              value={name}
              disabled={submitting}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-desc">Описание</Label>
            <Textarea
              id="material-desc"
              rows={2}
              placeholder="Необязательно"
              value={description}
              disabled={submitting}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Тег</Label>
            <Select
              value={tagChoice}
              onValueChange={(v) => setTagChoice(v ?? TAG_AUTO)}
              disabled={submitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {tagChoice === TAG_AUTO
                    ? "Определить автоматически"
                    : MATERIAL_TAG_LABELS[tagChoice as MaterialTag]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TAG_AUTO}>Определить автоматически</SelectItem>
                {MATERIAL_TAGS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {MATERIAL_TAG_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {submitLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
