"use client";

import { useActionState } from "react";
import { updatePatientAction } from "../actions";
import { Field, Input, Select, FormError } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";

type PatientEditable = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  sex: string;
  phone: string;
  address: string;
  bloodGroup: string;
  genotype: string;
  allergies: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelation: string;
};

export function EditPatientForm({ patient }: { patient: PatientEditable }) {
  const [state, formAction, pending] = useActionState(updatePatientAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="patientId" value={patient.id} />
      <FormError>{state?.error}</FormError>

      <fieldset className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Full name" htmlFor="fullName">
            <Input id="fullName" name="fullName" defaultValue={patient.fullName} required />
          </Field>
        </div>
        <Field label="Date of birth" htmlFor="dateOfBirth">
          <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth} required />
        </Field>
        <Field label="Sex" htmlFor="sex">
          <Select id="sex" name="sex" defaultValue={patient.sex} required>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={patient.phone} required />
        </Field>
        <Field label="Blood group" htmlFor="bloodGroup">
          <Select id="bloodGroup" name="bloodGroup" defaultValue={patient.bloodGroup}>
            <option value="">Unknown</option>
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </Select>
        </Field>
        <Field label="Genotype" htmlFor="genotype">
          <Select id="genotype" name="genotype" defaultValue={patient.genotype}>
            <option value="">Unknown</option>
            {["AA", "AS", "SS", "AC", "SC"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" defaultValue={patient.address} required />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Allergies" htmlFor="allergies" hint="Comma-separated. Leave blank if none known.">
            <Input id="allergies" name="allergies" defaultValue={patient.allergies} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-3 gap-4">
        <legend className="col-span-3 text-sm font-semibold text-[var(--color-text)]">Next of kin</legend>
        <Field label="Full name" htmlFor="nextOfKinName">
          <Input id="nextOfKinName" name="nextOfKinName" defaultValue={patient.nextOfKinName} required />
        </Field>
        <Field label="Phone" htmlFor="nextOfKinPhone">
          <Input id="nextOfKinPhone" name="nextOfKinPhone" defaultValue={patient.nextOfKinPhone} required />
        </Field>
        <Field label="Relationship" htmlFor="nextOfKinRelation">
          <Input id="nextOfKinRelation" name="nextOfKinRelation" defaultValue={patient.nextOfKinRelation} required />
        </Field>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <LinkButton href={`/patients/${patient.id}`} variant="secondary">Cancel</LinkButton>
        <Button type="submit" loading={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
