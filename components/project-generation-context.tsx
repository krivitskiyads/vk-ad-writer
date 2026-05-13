"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ProjectGenerationContextValue = {
  generatingProjectId: string | null;
  setGenerating: (projectId: string | null) => void;
  /** Инкремент после успешной генерации текстов — чтобы клиентские виджеты (Использование) перезапросили RPC. */
  usageRefreshTick: number;
  bumpUsageRefresh: () => void;
};

const ProjectGenerationContext =
  createContext<ProjectGenerationContextValue | null>(null);

export function ProjectGenerationProvider({ children }: { children: ReactNode }) {
  const [generatingProjectId, setGeneratingProjectId] = useState<string | null>(
    null
  );
  const [usageRefreshTick, setUsageRefreshTick] = useState(0);
  const setGenerating = useCallback((projectId: string | null) => {
    setGeneratingProjectId(projectId);
  }, []);
  const bumpUsageRefresh = useCallback(() => {
    setUsageRefreshTick((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      generatingProjectId,
      setGenerating,
      usageRefreshTick,
      bumpUsageRefresh,
    }),
    [generatingProjectId, setGenerating, usageRefreshTick, bumpUsageRefresh]
  );

  return (
    <ProjectGenerationContext.Provider value={value}>
      {children}
    </ProjectGenerationContext.Provider>
  );
}

export function useProjectGeneration(): ProjectGenerationContextValue {
  const ctx = useContext(ProjectGenerationContext);
  if (!ctx) {
    throw new Error("useProjectGeneration: нет ProjectGenerationProvider");
  }
  return ctx;
}

export function useProjectGenerationOptional(): ProjectGenerationContextValue | null {
  return useContext(ProjectGenerationContext);
}
