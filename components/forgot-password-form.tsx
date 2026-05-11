"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isValidEmail(email)) {
      setError("Введите корректный email");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (authError) {
      setError(authError.message || "Не удалось отправить письмо");
      setLoading(false);
      return;
    }

    setSuccessMessage(`Письмо с инструкцией отправлено на ${email}`);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-violet-50/50 px-4">
      <Card className="w-full max-w-sm bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Восстановление пароля</CardTitle>
          <CardDescription>Отправим ссылку для установки нового пароля</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-violet-600 text-white hover:bg-violet-700"
              disabled={loading}
            >
              {loading ? "Отправляем..." : "Отправить ссылку"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-violet-700 hover:underline">
              Назад к логину
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
