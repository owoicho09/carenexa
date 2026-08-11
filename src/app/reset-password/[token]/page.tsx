import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-brand)] text-lg font-semibold text-white">
            CN
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Choose a new password</h1>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
