"use client";

import { useEffect } from "react";

export function AnalysisPoller({ projectId }: { projectId: string }) {
  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const status = data.project?.analysis_status;
        if (status === "ready" || status === "failed") {
          clearInterval(interval);
          window.location.reload();
        }
      } catch (e) {
        console.error("[poller]", e);
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId]);

  return null;
}

