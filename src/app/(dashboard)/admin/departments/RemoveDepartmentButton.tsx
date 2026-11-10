"use client";

import { useActionState, useState } from "react";
import { removeDepartmentAction } from "./actions";

export function RemoveDepartmentButton({ departmentId, name }: { departmentId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(removeDepartmentAction, undefined);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
        Remove
      </button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="departmentId" value={departmentId} />
      <button type="submit" disabled={pending} className="rounded bg-[var(--color-danger)] px-2 py-1 text-xs font-medium text-white disabled:opacity-60">
        {pending ? "Removing…" : `Remove ${name}`}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-[var(--color-text-muted)]">Cancel</button>
      {state?.error && <span className="text-xs text-[var(--color-danger)]">{state.error}</span>}
    </form>
  );
}
