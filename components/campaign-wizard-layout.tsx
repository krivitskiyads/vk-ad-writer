"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignStepper } from "@/components/campaign-stepper";

type Props = {
  projectId: string;
  projectName: string;
  campaignId: string;
  initialCampaignName: string;
  children: React.ReactNode;
};

export function CampaignWizardLayout({
  projectId,
  projectName,
  campaignId,
  initialCampaignName,
  children,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialCampaignName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialCampaignName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(initialCampaignName);
    setDraft(initialCampaignName);
  }, [initialCampaignName]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const cancelEdit = () => {
    setEditing(false);
    setDraft(name);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Имя кампании не может быть пустым");
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      setName(trimmed);
      setEditing(false);
      toast.success("Название обновлено");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">
          Проекты
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-foreground truncate max-w-[40vw]"
        >
          {projectName}
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
        {editing ? (
          <div className="flex flex-wrap items-center gap-2 text-foreground">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className="h-8 w-56 max-w-full"
              disabled={saving}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => void saveEdit()}
              disabled={saving}
              aria-label="Сохранить"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={cancelEdit}
              disabled={saving}
              aria-label="Отмена"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            <span className="truncate font-medium text-foreground">{name}</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0 text-muted-foreground"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              aria-label="Переименовать кампанию"
            >
              <Pencil className="size-3.5" aria-hidden />
            </Button>
          </div>
        )}
      </nav>

      <CampaignStepper projectId={projectId} campaignId={campaignId} />

      <div>{children}</div>
    </div>
  );
}
