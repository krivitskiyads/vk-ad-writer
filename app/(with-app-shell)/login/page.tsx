import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <LoginForm
      callbackError={sp.error}
      message={sp.message}
      next={sp.next}
    />
  );
}

