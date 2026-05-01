"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { extractTextFromProjectFile } from "@/lib/extract-project-file-text";
import {
  ACCEPT_FILE_ATTR,
  formatFileSize,
  MAX_PROJECT_FILE_BYTES,
  validateProjectFile,
} from "@/lib/project-files";
import {
  deleteProjectFile,
  getProject,
  getProjectFiles,
  saveProjectFile,
  updateProject,
} from "@/lib/supabase/queries";
import { cn, createClientId } from "@/lib/utils";

const STORAGE_KEY_DESCRIPTION = "project_description";
const STORAGE_KEY_REFERENCE_TEXTS = "project_reference_texts";
const STORAGE_KEY_PROJECT_FILES_CONTENT = "project_files_content";

export type LocalUploadItem = {
  id: string;
  dbId?: string;
  fileName: string;
  fileSize: number;
  file?: File;
  extractStatus: "pending" | "ready" | "skipped" | "error" | "saving";
  extractedContent?: string;
  extractError?: string;
};

type ProjectUploadFormProps = {
  projectId: string;
};

export function ProjectUploadForm({ projectId }: ProjectUploadFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<LocalUploadItem[]>([]);
  const [description, setDescription] = useState("");
  const [referenceTexts, setReferenceTexts] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const descriptionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const initialDescriptionRef = useRef<string | null>(null);

  // ── Загрузка состояния: проект + файлы из Supabase, reference_texts — локально как fallback ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      try {
        setReferenceTexts(
          localStorage.getItem(STORAGE_KEY_REFERENCE_TEXTS) ?? ""
        );
      } catch {
        // ignore
      }

      try {
        const project = await getProject(projectId);
        if (cancelled) return;
        const desc =
          typeof (project as { description?: unknown } | null)?.description ===
          "string"
            ? ((project as { description: string }).description ?? "")
            : "";
        setDescription(desc);
        initialDescriptionRef.current = desc;
      } catch (e) {
        console.error("[upload] getProject failed", e);
        try {
          const fallback =
            localStorage.getItem(STORAGE_KEY_DESCRIPTION) ?? "";
          if (!cancelled) {
            setDescription(fallback);
            initialDescriptionRef.current = fallback;
          }
        } catch {
          // ignore
        }
      }

      try {
        const files = await getProjectFiles(projectId);
        if (cancelled) return;
        const arr = (files ?? []) as Array<{
          id: string;
          file_name: string;
          file_size: number;
          content: string | null;
        }>;
        const mapped: LocalUploadItem[] = arr.map((f) => ({
          id: createClientId(),
          dbId: f.id,
          fileName: f.file_name,
          fileSize: f.file_size ?? 0,
          extractStatus: "ready",
          extractedContent: f.content ?? "",
        }));
        setItems(mapped);
      } catch (e) {
        console.error("[upload] getProjectFiles failed", e);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const next: LocalUploadItem[] = [];
      for (const file of Array.from(fileList)) {
        const err = validateProjectFile(file);
        if (err === "size") {
          toast.error(
            `Файл «${file.name}» больше 20 МБ — выберите другой файл.`
          );
          continue;
        }
        if (err === "type") {
          toast.error(
            `Файл «${file.name}» — недопустимый формат. Разрешены PDF, DOCX, TXT, CSV, JPG, PNG.`
          );
          continue;
        }
        const id = createClientId();
        next.push({
          id,
          fileName: file.name,
          fileSize: file.size,
          file,
          extractStatus: "pending",
        });
      }
      if (!next.length) return;
      setItems((prev) => [...prev, ...next]);

      for (const item of next) {
        if (!item.file) continue;
        void extractTextFromProjectFile(item.file).then(async (result) => {
          if (!result.ok) {
            setItems((prev) =>
              prev.map((x) => {
                if (x.id !== item.id) return x;
                if (result.reason === "skipped") {
                  return { ...x, extractStatus: "skipped" };
                }
                toast.error(
                  `«${item.fileName}»: ${result.message ?? "ошибка чтения"}`
                );
                return {
                  ...x,
                  extractStatus: "error",
                  extractError: result.message,
                };
              })
            );
            return;
          }

          // Отметим "saving" пока пишем в Supabase
          setItems((prev) =>
            prev.map((x) =>
              x.id === item.id
                ? {
                    ...x,
                    extractStatus: "saving",
                    extractedContent: result.content,
                  }
                : x
            )
          );

          try {
            const saved = await saveProjectFile(
              projectId,
              item.fileName,
              result.content,
              item.fileSize
            );
            const savedId = (saved as { id?: string } | null)?.id;
            setItems((prev) =>
              prev.map((x) =>
                x.id === item.id
                  ? {
                      ...x,
                      dbId: savedId,
                      extractStatus: "ready",
                    }
                  : x
              )
            );
          } catch (e) {
            console.error("[upload] saveProjectFile failed", e);
            toast.error(
              `Не удалось сохранить «${item.fileName}» в облако. Файл остаётся локально.`
            );
            setItems((prev) =>
              prev.map((x) =>
                x.id === item.id
                  ? { ...x, extractStatus: "ready" }
                  : x
              )
            );
          }
        });
      }
    },
    [projectId]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles]
  );

  async function removeItem(item: LocalUploadItem) {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    if (item.dbId) {
      try {
        await deleteProjectFile(item.dbId);
      } catch (e) {
        console.error("[upload] deleteProjectFile failed", e);
        toast.error(`Не удалось удалить «${item.fileName}» из облака.`);
      }
    }
  }

  // ── Описание: автосохранение в Supabase + localStorage (fallback) ──
  useEffect(() => {
    if (loading) return;
    if (initialDescriptionRef.current === description) return;
    if (descriptionSaveTimer.current) {
      clearTimeout(descriptionSaveTimer.current);
    }
    descriptionSaveTimer.current = setTimeout(async () => {
      try {
        await updateProject(projectId, { description });
        initialDescriptionRef.current = description;
      } catch (e) {
        console.error("[upload] updateProject(description) failed", e);
      }
      try {
        localStorage.setItem(STORAGE_KEY_DESCRIPTION, description);
      } catch {
        // ignore
      }
    }, 600);

    return () => {
      if (descriptionSaveTimer.current) {
        clearTimeout(descriptionSaveTimer.current);
      }
    };
  }, [description, projectId, loading]);

  async function handleNext() {
    const trimmed = description.trim();
    if (!trimmed && items.length === 0) {
      toast.error("Добавьте описание проекта или загрузите файлы");
      return;
    }
    if (
      items.some(
        (i) => i.extractStatus === "pending" || i.extractStatus === "saving"
      )
    ) {
      toast.error("Подождите, идёт сохранение файлов…");
      return;
    }

    // Параллельно форсим сохранение описания (flush debounced)
    try {
      await updateProject(projectId, { description });
    } catch (e) {
      console.error("[upload] updateProject final failed", e);
    }

    // Fallback: снимок данных в localStorage — на случай проблем с Supabase
    try {
      const projectFilesContent = items
        .filter(
          (i) => i.extractStatus === "ready" && i.extractedContent != null
        )
        .map((i) => ({
          fileName: i.fileName,
          content: i.extractedContent as string,
        }));
      localStorage.setItem(STORAGE_KEY_DESCRIPTION, description);
      localStorage.setItem(STORAGE_KEY_REFERENCE_TEXTS, referenceTexts);
      localStorage.setItem(
        STORAGE_KEY_PROJECT_FILES_CONTENT,
        JSON.stringify(projectFilesContent)
      );
    } catch {
      // ignore — localStorage — всего лишь fallback
    }

    router.push(`/project/${projectId}/analysis`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="notion-page-title">Загрузка материалов</h1>
        <p className="notion-page-subtitle">
          Добавьте файлы и кратко опишите задачу — позже здесь появится отправка в
          хранилище.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={ACCEPT_FILE_ATTR}
        multiple
        onChange={onInputChange}
        aria-hidden
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node))
            setIsDragging(false);
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-[12px] border border-dashed border-[#ddd6fe] bg-card p-10 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          "hover:bg-[#f5f3ff] hover:border-[#a78bfa]",
          isDragging && "border-[#a78bfa] bg-[#f5f3ff]"
        )}
      >
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#f5f3ff] text-[#7c3aed]">
          <Upload className="size-6" aria-hidden />
        </div>
        <p className="text-foreground text-[1rem] font-semibold">
          Перетащите файлы сюда или нажмите для выбора
        </p>
        <p className="notion-page-subtitle mt-2 !text-sm">
          PDF, DOCX, TXT, CSV, JPG, PNG · до {formatFileSize(MAX_PROJECT_FILE_BYTES)}{" "}
          на файл
        </p>
      </div>

      {loading && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Загружаем данные проекта…
        </div>
      )}

      {items.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-[1.38rem] font-bold tracking-[-0.02em]">
              Загруженные файлы
            </CardTitle>
            <CardDescription>
              Сохраняются в облаке и доступны на всех устройствах
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="divide-border divide-y rounded-lg border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileUp
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium">
                      {item.fileName}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatFileSize(item.fileSize)}
                    </span>
                    {item.extractStatus === "pending" && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        · извлечение текста…
                      </span>
                    )}
                    {item.extractStatus === "saving" && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        · сохранение в облако…
                      </span>
                    )}
                    {item.extractStatus === "skipped" && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        · изображение
                      </span>
                    )}
                    {item.extractStatus === "ready" && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        · {item.dbId ? "в облаке" : "текст извлечён"}
                      </span>
                    )}
                    {item.extractStatus === "error" && (
                      <span className="text-destructive shrink-0 text-xs">
                        · ошибка чтения
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeItem(item);
                    }}
                    aria-label={`Удалить ${item.fileName}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2">
        <label htmlFor="project-desc" className="text-sm font-medium">
          Описание проекта
        </label>
        <Textarea
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Цель кампании, аудитория, оффер, ограничения по тексту…"
          rows={5}
          className="min-h-[120px] resize-y"
        />
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-[1.38rem] font-bold tracking-[-0.02em]">
            Примеры хороших текстов (необязательно)
          </CardTitle>
          <CardDescription>
            Вставьте тексты, на которые хотите равняться — свои лучшие,
            конкурентов или из других ниш
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={referenceTexts}
            onChange={(e) => {
              const v = e.target.value;
              setReferenceTexts(v);
              try {
                localStorage.setItem(STORAGE_KEY_REFERENCE_TEXTS, v);
              } catch {
                // ignore
              }
            }}
            placeholder="Вставьте сюда 1-3 примера рекламных текстов, которые вам нравятся. Это поможет AI понять желаемый стиль и тональность."
            rows={8}
            className="min-h-[200px] resize-y"
          />
        </CardContent>
      </Card>

      <Card className="shadow-none border border-[#62aef0]/25 bg-[#f2f9ff]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[1.1rem] font-bold">
            Что полезно загрузить
          </CardTitle>
          <CardDescription>
            Чем полнее контекст, тем точнее будут рекламные тексты
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc space-y-1.5 text-sm">
            <li>Бриф или ТЗ на рекламу</li>
            <li>Прайс, условия акций, УТП</li>
            <li>Примеры конкурентов или референсы тона</li>
            <li>Отзывы клиентов, кейсы, цифры</li>
            <li>Логотипы и креативы в PNG/JPG при необходимости</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-2">
        <Button type="button" onClick={handleNext} className="gap-2">
          Далее — запустить анализ
        </Button>
      </div>
    </div>
  );
}
