"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  token: string;
  workspaceSlug: string;
  workspaceName: string;
};

export function AcceptInvitation({
  token,
  workspaceSlug,
  workspaceName,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("accept_invitation", {
      p_token: token,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message || "Не удалось принять приглашение");
      return;
    }
    toast.success("Ты добавлен в workspace");
    router.push(`/w/${workspaceSlug}/projects`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Принять приглашение в workspace{" "}
        <span className="font-semibold text-foreground">«{workspaceName}»</span>
        ?
      </p>
      {error ? (
        <p className="text-center text-sm text-destructive">{error}</p>
      ) : null}
      <Button
        type="button"
        className="w-full bg-violet-600 text-white hover:bg-violet-700"
        disabled={busy}
        onClick={() => void accept()}
      >
        {busy ? "Подождите…" : "Принять"}
      </Button>
    </div>
  );
}
