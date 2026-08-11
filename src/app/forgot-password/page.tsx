import { Logo } from "@/components/ui/Logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <Logo size={44} />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Reset your password</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Enter the email on your hospital account</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
