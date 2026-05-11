"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn, humanizeSupabasePermissionError } from "@/lib/utils";

const REFRESH_EVENT = "workspace-team-refresh";

export type WorkspaceMemberRow = {
  member_id: string;
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
};

type Props = {
  workspaceId: string;
  currentUserId: string;
  isWorkspaceOwner: boolean;
};

export function MembersList({
  workspaceId,
  currentUserId,
  isWorkspaceOwner,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<WorkspaceMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_workspace_members", {
      p_workspace_id: workspaceId,
    });
    if (error) {
      console.error("[get_workspace_members]", error);
      toast.error(humanizeSupabasePermissionError(error));
      setRows([]);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as WorkspaceMemberRow[];
    setRows(list);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, [load]);

  async function removeMember(userId: string, email: string) {
    const self = userId === currentUserId;
    const msg = self
      ? "Покинуть это рабочее пространство?"
      : `Удалить участника ${email}?`;
    if (!confirm(msg)) return;

    setRemovingId(userId);
    const supabase = createClient();
    const { error } = await supabase.rpc("remove_workspace_member", {
      p_workspace_id: workspaceId,
      p_user_id: userId,
    });
    setRemovingId(null);
    if (error) {
      toast.error(humanizeSupabasePermissionError(error));
      return;
    }
    toast.success(self ? "Ты покинул workspace" : "Участник удалён");
    if (self) {
      router.push("/projects");
      router.refresh();
      return;
    }
    void load();
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Загрузка участников…</p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Участников пока нет.</p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-white">
      {rows.map((m) => {
        const isOwnerRole = m.role === "owner";
        const canRemove =
          (isWorkspaceOwner &&
            m.user_id !== currentUserId &&
            !isOwnerRole) ||
          (!isWorkspaceOwner && m.user_id === currentUserId);
        return (
          <li
            key={m.member_id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {m.email}
              </p>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                  isOwnerRole
                    ? "border-violet-200 bg-violet-50 text-violet-800"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                {isOwnerRole ? "Владелец" : "Участник"}
              </span>
            </div>
            {canRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={removingId === m.user_id}
                aria-label={m.user_id === currentUserId ? "Покинуть" : "Удалить"}
                onClick={() => void removeMember(m.user_id, m.email)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function dispatchWorkspaceTeamRefresh(): void {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}
