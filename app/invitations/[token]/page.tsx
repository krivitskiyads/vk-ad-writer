import Link from "next/link";

import { AcceptInvitation } from "@/components/accept-invitation";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PreviewOk = {
  valid: true;
  workspace_name: string;
  workspace_slug: string;
  email: string;
  inviter_email: string | null;
  role: string;
  expires_at: string;
};

type PreviewBad = {
  valid: false;
  reason: string;
};

function reasonMessage(reason: string): string {
  switch (reason) {
    case "not_found":
      return "Приглашение не найдено";
    case "already_accepted":
      return "Приглашение уже принято";
    case "expired":
      return "Срок приглашения истёк";
    default:
      return "Приглашение недоступно";
  }
}

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServerSupabase();

  const { data: raw, error } = await supabase.rpc("preview_invitation", {
    p_token: token,
  });

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
        <Card className="border-destructive/30 bg-white">
          <CardHeader>
            <CardTitle>Ошибка</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className={cn(buttonVariants(), "w-full")}>
              На главную
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const preview = raw as PreviewOk | PreviewBad;

  if (!preview || typeof preview !== "object" || !("valid" in preview)) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Приглашение</CardTitle>
            <CardDescription>Не удалось загрузить данные</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className={cn(buttonVariants(), "w-full")}>
              На главную
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preview.valid) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Приглашение</CardTitle>
            <CardDescription>
              {reasonMessage(preview.reason)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className={cn(buttonVariants(), "w-full")}>
              На главную
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/invitations/${token}`;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(nextPath)}&email=${encodeURIComponent(preview.email)}`;

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
        <Card className="bg-white">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Приглашение в команду</CardTitle>
            <CardDescription className="space-y-2 pt-2 text-left">
              <p>
                Тебя пригласили в workspace{" "}
                <span className="font-semibold text-foreground">
                  «{preview.workspace_name}»
                </span>
                .
              </p>
              <p>
                От{" "}
                <span className="font-medium text-foreground">
                  {preview.inviter_email ?? "—"}
                </span>{" "}
                для{" "}
                <span className="font-medium text-foreground">
                  {preview.email}
                </span>
                .
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              href={loginHref}
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full justify-center bg-violet-600 text-white hover:bg-violet-700"
              )}
            >
              Войти
            </Link>
            <Link
              href={signupHref}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full justify-center"
              )}
            >
              Зарегистрироваться
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <Card className="bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Приглашение</CardTitle>
          <CardDescription>
            Workspace «{preview.workspace_name}»
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitation
            token={token}
            workspaceSlug={preview.workspace_slug}
            workspaceName={preview.workspace_name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
