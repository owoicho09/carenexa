import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { PERMISSIONS } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/nav";
import { setRolePermissionAction } from "./actions";
import { SubmitWithToast } from "@/components/ui/SubmitWithToast";
import type { StaffRole } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth";

const ASSIGNABLE_ROLES: StaffRole[] = [
  "RECORDS_OFFICER",
  "RECEPTIONIST",
  "NURSE",
  "CLINICIAN",
  "LAB_SCIENTIST",
  "PHARMACIST",
  "RECRUITER",
];

export default async function PermissionsPage() {
  const session = await requireSession(["ADMIN"]);
  const rows = await db.rolePermission.findMany({ where: { hospitalId: session.hospitalId } });
  const enabled = new Set(rows.filter((r) => r.enabled).map((r) => `${r.role}:${r.permission}`));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="The Administrator always has every capability. Grant specific roles extra reach here — everyone starts with none of these."
      />

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-2 font-medium">Role</th>
              {PERMISSIONS.map((p) => (
                <th key={p.key} className="px-3 py-2 text-center font-medium">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASSIGNABLE_ROLES.map((role) => (
              <tr key={role} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)] whitespace-nowrap">{ROLE_LABEL[role]}</td>
                {PERMISSIONS.map((p) => {
                  const isEnabled = enabled.has(`${role}:${p.key}`);
                  return (
                    <td key={p.key} className="px-3 py-2.5 text-center">
                      <form action={setRolePermissionAction}>
                        <input type="hidden" name="role" value={role} />
                        <input type="hidden" name="permission" value={p.key} />
                        <input type="hidden" name="enabled" value={(!isEnabled).toString()} />
                        <SubmitWithToast
                          successMessage={`${isEnabled ? "Revoked" : "Granted"} ${p.label.toLowerCase()} for ${ROLE_LABEL[role]}`}
                          className={`h-5 w-5 rounded border ${
                            isEnabled
                              ? "border-[var(--color-brand)] bg-[var(--color-brand)]"
                              : "border-[var(--color-border-strong)] bg-[var(--color-surface)]"
                          }`}
                          aria-label={`${isEnabled ? "Revoke" : "Grant"} ${p.label} for ${ROLE_LABEL[role]}`}
                        >
                          {isEnabled && (
                            <svg viewBox="0 0 16 16" fill="white" className="h-full w-full p-0.5">
                              <path d="M13.5 4.5l-7 7L3 8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </SubmitWithToast>
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
