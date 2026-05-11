"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
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
import { dispatchWorkspaceTeamRefresh } from "@/components/members-list";
import { createClient } from "@/lib/supabase/client";
import { humanizeSupabasePermissionError } from "@/lib/utils";

type InviteResult =
  | { type: "added"; user_id: string; email: string }
  | { type: "invited"; token: string; email: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
};

function mapInviteError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already member")) {
    return "Этот пользователь уже в workspace";
  }
  if (m.includes("invalid email")) {
    return "Некорректный email";
  }
  if (m.includes("only workspace owner")) {
    return "Приглашать может только владелец";
  }
  return message;
}

export function TeamInviteControls({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="size-4 shrink-0" aria-hidden />
        Пригласить участника
      </Button>
      <InviteDialog
        open={open}
        onOpenChange={setOpen}
        workspaceId={workspaceId}
      />
    </>
  );
}

export function InviteDialog({ open, onOpenChange, workspaceId }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  function resetState() {
    setEmail("");
    setError(null);
    setPendingLink(null);
    setBusy(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  async function submit() {
    setError(null);
    setPendingLink(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Введите email");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("invite_to_workspace", {
      p_workspace_id: workspaceId,
      p_email: trimmed,
    });
    setBusy(false);

    if (rpcError) {
      const msg =
        rpcError.code === "42501"
          ? humanizeSupabasePermissionError(rpcError)
          : mapInviteError(rpcError.message);
      setError(msg);
      return;
    }

    const payload = data as InviteResult | null;
    if (!payload || typeof payload !== "object" || !("type" in payload)) {
      setError("Неожиданный ответ сервера");
      return;
    }

    if (payload.type === "added") {
      toast.success(`${payload.email} добавлен в workspace`);
      dispatchWorkspaceTeamRefresh();
      handleOpenChange(false);
      return;
    }

    if (payload.type === "invited" && payload.token) {
      const url = `${window.location.origin}/invitations/${payload.token}`;
      setPendingLink(url);
      dispatchWorkspaceTeamRefresh();
      return;
    }

    setError("Не удалось создать приглашение");
  }

  function copyPendingLink() {
    if (!pendingLink) return;
    void navigator.clipboard.writeText(pendingLink).then(
      () => toast.success("Ссылка скопирована"),
      () => toast.error("Не удалось скопировать")
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Пригласить участника</DialogTitle>
          <DialogDescription>
            Если пользователь уже зарегистрирован — он сразу попадёт в команду.
            Иначе появится ссылка для отправки вручную.
          </DialogDescription>
        </DialogHeader>

        {!pendingLink ? (
          <>
            <div className="space-y-2 py-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submit();
                  }
                }}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={busy}
              >
                Отмена
              </Button>
              <Button
                type="button"
                className="bg-violet-600 text-white hover:bg-violet-700"
                disabled={busy || !email.trim()}
                onClick={() => void submit()}
              >
                {busy ? "Отправка…" : "Пригласить"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-2 py-1">
              <p className="text-sm text-muted-foreground">
                Пользователь с таким email ещё не зарегистрирован. Отправь эту
                ссылку приглашённому:
              </p>
              <Input readOnly value={pendingLink} className="font-mono text-xs" />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={copyPendingLink}>
                Скопировать
              </Button>
              <Button
                type="button"
                className="bg-violet-600 text-white hover:bg-violet-700"
                onClick={() => handleOpenChange(false)}
              >
                Готово
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
