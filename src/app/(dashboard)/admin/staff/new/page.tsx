import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { NewStaffForm } from "./NewStaffForm";

export default async function NewStaffPage() {
  const departments = await db.department.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Add staff" description="Creates a login immediately usable in their department's workspace." />
      <Panel className="p-6">
        <NewStaffForm departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
      </Panel>
    </div>
  );
}
