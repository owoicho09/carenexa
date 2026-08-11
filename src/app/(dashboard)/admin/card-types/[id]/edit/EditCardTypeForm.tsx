"use client";

import { useActionState } from "react";
import { updateCardTypeAction } from "../../actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";

export function EditCardTypeForm({ cardType }: { cardType: { id: string; name: string; seriesCode: string; description: string } }) {
  const [state, formAction, pending] = useActionState(updateCardTypeAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="cardTypeId" value={cardType.id} />
      <FormError>{state?.error}</FormError>
      <Field label="Series code" hint="Permanent — already embedded in issued hospital numbers.">
        <Input value={cardType.seriesCode} disabled />
      </Field>
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" defaultValue={cardType.name} required />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={cardType.description} required />
      </Field>
      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <LinkButton href="/admin/card-types" variant="secondary">Cancel</LinkButton>
        <Button type="submit" loading={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
