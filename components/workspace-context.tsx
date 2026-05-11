"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Workspace } from "@/lib/types/workspace";

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): Workspace {
  const w = useContext(WorkspaceContext);
  if (!w) {
    throw new Error("useWorkspace: нет WorkspaceProvider");
  }
  return w;
}

export function useWorkspaceOptional(): Workspace | null {
  return useContext(WorkspaceContext);
}
