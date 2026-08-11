import { requireDepartmentAccess } from "@/lib/workspace";
import { getPendingRequestsForDepartmentSlug } from "@/lib/queues";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { QueueTable } from "@/components/queue/QueueTable";

export default async function DepartmentQueuePage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  const { department } = await requireDepartmentAccess(dept);
  const requests = await getPendingRequestsForDepartmentSlug(dept);

  return (
    <div className="space-y-6">
      <PageHeader title="Queue" description={`Every request waiting on ${department.name}, most urgent first.`} />
      <Panel>
        <QueueTable requests={requests} emptyLabel={`Nothing waiting on ${department.name} right now.`} />
      </Panel>
    </div>
  );
}
