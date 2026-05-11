export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-8 w-72 rounded bg-muted" />
        <div className="h-4 w-96 rounded bg-muted/70" />
      </div>
      <div className="h-40 rounded-xl border border-border bg-card" />
      <div className="h-48 rounded-xl border border-border bg-card" />
      <div className="h-32 rounded-xl border border-border bg-card" />
    </div>
  );
}
