import { AppShell } from "@/components/app-shell";

export default function WithAppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
