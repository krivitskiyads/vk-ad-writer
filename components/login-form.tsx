"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { safeInternalNextPath } from "@/lib/utils";

type Props = {
  callbackError?: string;
  message?: string;
  next?: string;
};

export function LoginForm({ callbackError, message, next }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Неверный email или пароль");
      setLoading(false);
      return;
    }

    const dest = safeInternalNextPath(next, "/projects");
    router.push(dest);
    router.refresh();
  }

  const afterAuth = safeInternalNextPath(next, "/projects");
  const signupHref = next
    ? `/signup?next=${encodeURIComponent(afterAuth)}`
    : "/signup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-violet-50/50 px-4">
      <Card className="w-full max-w-sm bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Генератор Кривицкого</CardTitle>
          <CardDescription>Войдите для доступа к генератору</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {callbackError === "auth_callback_failed" ? (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Ссылка устарела или некорректна. Попробуй войти или зарегистрироваться заново.
              </p>
            ) : null}
            {message === "password_updated" ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Пароль обновлён, теперь можешь войти.
              </p>
            ) : null}

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
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-violet-600 text-white hover:bg-violet-700"
              disabled={loading}
            >
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm">
            <div>
              Нет аккаунта?{" "}
              <Link href={signupHref} className="text-violet-700 hover:underline">
                Зарегистрироваться
              </Link>
            </div>
            <div>
              <Link href="/forgot-password" className="text-violet-700 hover:underline">
                Забыли пароль?
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
