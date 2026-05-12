"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

type WsRow = { id: string; name: string; slug: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentWorkspaceId: string;
};

function pluralPeople(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} человек`;
  if (mod10 === 1) return `${n} человек`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} человека`;
  return `${n} человек`;
}

export function MoveProjectDialog({
  open,
  onOpenChange,
  projectId,
  currentWorkspaceId,
}: Props) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WsRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [targetId, setTargetId] = useState<string>("");
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [moving, setMoving] = useState(false);

  const targets = useMemo(
    () => workspaces.filter((w) => w.id !== currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );

  const loadWorkspaces = useCallback(async () => {
    setLoadingList(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setWorkspaces([]);
        return;
      }
      const { data, error } = await supabase
        .from("workspace_members")
        .select(
          `joined_at, workspaces!inner(id, name, slug, owner_id, created_at)`
        )
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as { workspaces: WsRow }[];
      setWorkspaces(rows.map((r) => r.workspaces));
    } catch (e) {
      console.error("[MoveProjectDialog] list workspaces", e);
      toast.error("Не удалось загрузить список workspace");
      setWorkspaces([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setTargetId("");
      setMemberCount(null);
      return;
    }
    void loadWorkspaces();
  }, [open, loadWorkspaces]);

  useEffect(() => {
    if (!open || !targetId) {
      setMemberCount(null);
      return;
    }
    let cancelled = false;
    setLoadingCount(true);
    const supabase = createClient();
    void (async () => {
      try {
        const { count, error } = await supabase
          .from("workspace_members")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", targetId);
        if (error) throw error;
        if (!cancelled) setMemberCount(count ?? 0);
      } catch (e) {
        console.error("[MoveProjectDialog] member count", e);
        if (!cancelled) setMemberCount(null);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targetId]);

  const selected = targets.find((w) => w.id === targetId);
  const showMemberWarning =
    memberCount !== null && memberCount > 1 && !loadingCount;

  const move = async () => {
    if (!targetId) {
      toast.error("Выберите workspace");
      return;
    }
    setMoving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("move_project_to_workspace", {
        p_project_id: projectId,
        p_target_workspace_id: targetId,
      });
      if (error) throw new Error(error.message);
      const payload = data as {
        moved?: boolean;
        target_workspace_slug?: string;
        project_id?: string;
      } | null;
      const slug = payload?.target_workspace_slug;
      if (!slug) {
        throw new Error("Некорректный ответ сервера");
      }
      toast.success("Проект перенесён");
      onOpenChange(false);
      router.push(`/w/${slug}/projects`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось перенести");
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !moving && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Перенести проект</DialogTitle>
          <DialogDescription>
            Проект переедет в выбранный workspace со всеми материалами, анализом
            и текстами.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-2">
            <Label>Куда перенести</Label>
            {loadingList && targets.length === 0 ? (
              <div className="flex justify-center py-6">
                <Loader2
                  className="size-6 animate-spin text-muted-foreground"
                  aria-hidden
                />
              </div>
            ) : targets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Нет других workspace, в которые можно перенести проект.
              </p>
            ) : (
              <Select
                value={targetId}
                onValueChange={(v) => setTargetId(v ?? "")}
                disabled={moving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selected ? selected.name : "Выберите workspace"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {targets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {showMemberWarning && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Этот проект станет доступен всем участникам выбранного workspace (
              {pluralPeople(memberCount)}).
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={moving}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="bg-violet-600 text-white hover:bg-violet-700"
            disabled={moving || !targetId || targets.length === 0}
            onClick={() => void move()}
          >
            {moving && (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            )}
            Перенести
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
