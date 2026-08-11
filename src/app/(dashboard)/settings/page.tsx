import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/nav";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { ProfileForm } from "./ProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { toggleToastNotificationsAction } from "./actions";

export default async function SettingsPage() {
  const session = await requireSession();
  const staff = await db.staffMember.findUniqueOrThrow({
    where: { id: session.staffId },
    include: { department: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Your account, password, and notification preferences." />

      <Panel>
        <PanelHeader title="Profile" />
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Email</p>
              <p className="text-[var(--color-text)]">{staff.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Role</p>
              <p className="text-[var(--color-text)]">{ROLE_LABEL[staff.role]}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Department</p>
              <p className="text-[var(--color-text)]">{staff.department?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Job title</p>
              <p className="text-[var(--color-text)]">{staff.jobTitle}</p>
            </div>
          </div>
          <ProfileForm fullName={staff.fullName} />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Password" />
        <div className="p-4">
          <ChangePasswordForm />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Notifications" description="Pop-up alerts when work arrives. The bell and unread count always stay on." />
        <div className="p-4">
          <form action={toggleToastNotificationsAction} className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-text)]">Show pop-up notifications</p>
            <input type="hidden" name="enabled" value={(!staff.toastNotificationsEnabled).toString()} />
            <button
              type="submit"
              className={`relative h-6 w-11 rounded-full transition-colors ${
                staff.toastNotificationsEnabled ? "bg-[var(--color-brand)]" : "bg-[var(--color-border-strong)]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  staff.toastNotificationsEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </form>
        </div>
      </Panel>
    </div>
  );
}
