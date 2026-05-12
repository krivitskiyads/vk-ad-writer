"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";

import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { useWorkspaceOptional } from "@/components/workspace-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type WsRow = {
  id: string;
  name: string;
  slug: string;
};

export function WorkspaceSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const currentWorkspace = useWorkspaceOptional();
  const [workspaces, setWorkspaces] = useState<WsRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const activeSlug =
    pathname.startsWith("/w/") ? pathname.split("/")[2] ?? null : null;

  const loadWorkspaces = useCallback(async () => {
    setListLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setWorkspaces([]);
      setListLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("workspace_members")
      .select(`joined_at, workspaces!inner(id, name, slug, owner_id, created_at)`)
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true });
    if (error) {
      console.error("[workspace-switcher]", error);
      setWorkspaces([]);
      setListLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as {
      workspaces: { id: string; name: string; slug: string };
    }[];
    setWorkspaces(rows.map((r) => r.workspaces));
    setListLoading(false);
  }, []);

  if (!activeSlug || !currentWorkspace) {
    return null;
  }

  const triggerLabel = currentWorkspace.name.trim();

  return (
    <>
      <div className="px-2.5 pb-2">
        <Menu.Root
          onOpenChange={(open) => {
            if (open) void loadWorkspaces();
          }}
        >
          <Menu.Trigger
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md border border-white bg-white px-2.5 py-2 text-left text-[13px] font-medium text-foreground shadow-sm",
              "outline-none hover:bg-violet-50/80 focus-visible:ring-2 focus-visible:ring-violet-500"
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="start" sideOffset={6}>
              <Menu.Popup
                className={cn(
                  "z-50 min-w-[var(--anchor-width)] rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md",
                  "origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-closed:scale-95 data-closed:opacity-0 data-open:scale-100 data-open:opacity-100"
                )}
              >
                <Menu.Viewport className="max-h-64 overflow-y-auto">
                  {listLoading && workspaces.length === 0 ? (
                    <div className="flex justify-center py-6">
                      <Loader2
                        className="size-6 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                  ) : (
                    workspaces.map((w) => (
                      <Menu.Item
                        key={w.id}
                        onClick={() => {
                          if (w.slug !== activeSlug) {
                            router.push(`/w/${w.slug}/projects`);
                          }
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none data-highlighted:bg-violet-50"
                        )}
                      >
                        {w.slug === activeSlug ? (
                          <Check className="size-4 shrink-0 text-violet-600" aria-hidden />
                        ) : (
                          <span className="size-4 shrink-0" aria-hidden />
                        )}
                        <span className="truncate">{w.name}</span>
                      </Menu.Item>
                    ))
                  )}
                  <Menu.Separator className="my-1 h-px bg-border" />
                  <Menu.Item
                    onClick={() => setCreateOpen(true)}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none data-highlighted:bg-violet-50"
                  >
                    <Plus className="size-4 shrink-0 text-violet-600" aria-hidden />
                    Создать workspace
                  </Menu.Item>
                </Menu.Viewport>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
