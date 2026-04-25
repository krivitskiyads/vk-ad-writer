import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Генератор Кривицкого",
  description: "Генератор рекламных текстов для ВКонтакте",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body className={`${geistMono.variable} min-h-full`}>
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
