"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!isValidEmail(email)) return "Введите корректный email";
    if (password.length < 8) return "Пароль должен быть не короче 8 символов";
    if (password !== confirmPassword) return "Пароли не совпадают";
    return null;
  };

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/projects`,
      },
    });

    if (authError) {
      setError(authError.message || "Не удалось создать аккаунт");
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/projects");
      router.refresh();
      return;
    }

    if (data.user && data.session === null) {
      setSuccessMessage(
        `Письмо с подтверждением отправлено на ${email}. Перейди по ссылке чтобы активировать аккаунт.`
      );
      setLoading(false);
      return;
    }

    setError("Не удалось завершить регистрацию");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-violet-50/50 px-4">
      <Card className="w-full max-w-sm bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Создание аккаунта</CardTitle>
          <CardDescription>Зарегистрируйтесь для доступа к генератору</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
                placeholder="Минимум 8 символов"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
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
              {loading ? "Создаём..." : "Создать аккаунт"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-violet-700 hover:underline">
              Войти
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
