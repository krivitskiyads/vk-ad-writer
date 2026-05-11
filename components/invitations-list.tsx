"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { humanizeSupabasePermissionError } from "@/lib/utils";

const REFRESH_EVENT = "workspace-team-refresh";

export type WorkspaceInvitationRow = {
  invitation_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
};

type Props = {
  workspaceId: string;
};

export function InvitationsList({ workspaceId }: Props) {
  const [rows, setRows] = useState<WorkspaceInvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_workspace_invitations", {
      p_workspace_id: workspaceId,
    });
    if (error) {
      console.error("[get_workspace_invitations]", error);
      toast.error(humanizeSupabasePermissionError(error));
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as WorkspaceInvitationRow[]);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, [load]);

  function copyLink(token: string) {
    const url = `${window.location.origin}/invitations/${token}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Ссылка скопирована"),
      () => toast.error("Не удалось скопировать")
    );
  }

  async function cancel(id: string) {
    if (!confirm("Отменить это приглашение?")) return;
    setCancellingId(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_invitation", {
      p_invitation_id: id,
    });
    setCancellingId(null);
    if (error) {
      toast.error(humanizeSupabasePermissionError(error));
      return;
    }
    toast.success("Приглашение отменено");
    void load();
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Загрузка приглашений…</p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Активных приглашений нет</p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-white">
      {rows.map((inv) => (
        <li
          key={inv.invitation_id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {inv.email}
          </span>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => copyLink(inv.token)}
            >
              <Copy className="size-3.5" aria-hidden />
              Скопировать ссылку
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              disabled={cancellingId === inv.invitation_id}
              aria-label="Отменить приглашение"
              onClick={() => void cancel(inv.invitation_id)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
