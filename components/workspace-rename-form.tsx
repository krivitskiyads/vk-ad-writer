"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/types/workspace";

type Props = {
  workspace: Workspace;
  isOwner: boolean;
};

export function WorkspaceRenameForm({ workspace, isOwner }: Props) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(workspace.name);
  }, [workspace.id, workspace.name]);

  const trimmed = name.trim();
  const changed = trimmed !== workspace.name.trim();
  const canSave = isOwner && changed && trimmed.length >= 2;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("rename_workspace", {
        p_workspace_id: workspace.id,
        p_new_name: trimmed,
      });
      if (error) {
        throw new Error(error.message);
      }
      toast.success("Название обновлено");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardDescription>
          Отображаемое имя в интерфейсе. Адрес в браузере (/w/{workspace.slug})
          не меняется.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Название workspace</Label>
          <Input
            id="workspace-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner || saving}
            autoComplete="off"
          />
          {!isOwner ? (
            <p className="text-sm text-muted-foreground">
              Только владелец может изменять настройки
            </p>
          ) : null}
        </div>
        {isOwner ? (
          <Button
            type="button"
            className="bg-violet-600 text-white hover:bg-violet-700"
            disabled={!canSave || saving}
            onClick={() => void submit()}
          >
            Сохранить
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
