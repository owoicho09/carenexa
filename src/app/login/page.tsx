import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession, homeRoute } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect(homeRoute(session));

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <Logo size={44} />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">CareNexa</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Sign in with your hospital account</p>
        </div>
        <LoginForm />
        <p className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="text-[var(--color-brand)] hover:underline">Forgot your password?</Link>
        </p>
        <p className="mt-4 text-center text-xs text-[var(--color-text-faint)]">
          Trouble signing in? Contact Hospital Administration.
        </p>
      </div>
    </div>
  );
}
