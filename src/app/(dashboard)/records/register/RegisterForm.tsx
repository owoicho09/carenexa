"use client";

import { useActionState } from "react";
import { registerPatientAction } from "../actions";
import { Field, Input, Select, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function RegisterForm({ cardTypes }: { cardTypes: { id: string; name: string; seriesCode: string }[] }) {
  const [state, formAction, pending] = useActionState(registerPatientAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <FormError>{state?.error}</FormError>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-text)]">Card type</legend>
        <Field label="Card type" htmlFor="cardTypeId">
          <Select id="cardTypeId" name="cardTypeId" required defaultValue="">
            <option value="" disabled>Select a card type…</option>
            {cardTypes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.seriesCode})</option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-4">
        <legend className="col-span-2 text-sm font-semibold text-[var(--color-text)]">Identity</legend>
        <div className="col-span-2 rounded-md border border-[var(--color-border)] p-3">
          <Field label="Existing CareNexa number (optional)" htmlFor="universalPatientNumber" hint="Only link an existing network identity after checking the patient in person.">
            <Input id="universalPatientNumber" name="universalPatientNumber" placeholder="CNX-…" />
          </Field>
          <Field label="In-person verification evidence reference" htmlFor="identityEvidenceReference" hint="Required only when linking an existing CareNexa number.">
            <Input id="identityEvidenceReference" name="identityEvidenceReference" placeholder="Consent/verification record reference" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Full name" htmlFor="fullName">
            <Input id="fullName" name="fullName" required placeholder="e.g. Chinwe Okafor" />
          </Field>
        </div>
        <Field label="Date of birth" htmlFor="dateOfBirth">
          <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
        </Field>
        <Field label="Sex" htmlFor="sex">
          <Select id="sex" name="sex" required defaultValue="">
            <option value="" disabled>Select…</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" required placeholder="0803 123 4567" />
        </Field>
        <Field label="Blood group" htmlFor="bloodGroup">
          <Select id="bloodGroup" name="bloodGroup" defaultValue="">
            <option value="">Unknown</option>
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </Select>
        </Field>
        <Field label="Genotype" htmlFor="genotype">
          <Select id="genotype" name="genotype" defaultValue="">
            <option value="">Unknown</option>
            {["AA", "AS", "SS", "AC", "SC"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" required placeholder="Street, city, state" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Allergies" htmlFor="allergies" hint="Comma-separated, e.g. Penicillin, Sulfa drugs. Leave blank if none known.">
            <Input id="allergies" name="allergies" placeholder="Penicillin, Sulfa drugs" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-3 gap-4">
        <legend className="col-span-3 text-sm font-semibold text-[var(--color-text)]">Next of kin</legend>
        <Field label="Full name" htmlFor="nextOfKinName">
          <Input id="nextOfKinName" name="nextOfKinName" required />
        </Field>
        <Field label="Phone" htmlFor="nextOfKinPhone">
          <Input id="nextOfKinPhone" name="nextOfKinPhone" required />
        </Field>
        <Field label="Relationship" htmlFor="nextOfKinRelation">
          <Input id="nextOfKinRelation" name="nextOfKinRelation" required placeholder="Spouse, parent, sibling…" />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-text)]">Today&rsquo;s visit</legend>
        <Field label="Presenting complaint" htmlFor="presentingComplaint" hint="What the patient says is wrong, in their own words — optional at registration.">
          <Textarea id="presentingComplaint" name="presentingComplaint" placeholder="e.g. Fever and headache for 3 days" />
        </Field>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <Button type="submit" loading={pending}>
          {pending ? "Registering…" : "Register patient & open visit"}
        </Button>
      </div>
    </form>
  );
}
