import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <AppSidebar />
      <main className="min-h-0 flex-1 overflow-auto px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-[800px]">{children}</div>
      </main>
    </div>
  );
}
