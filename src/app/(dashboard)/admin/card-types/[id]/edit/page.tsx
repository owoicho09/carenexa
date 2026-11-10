import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { EditCardTypeForm } from "./EditCardTypeForm";
import { requireSession } from "@/lib/auth";

export default async function EditCardTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(["ADMIN"]);
  const cardType = await db.cardType.findFirst({ where: { id, hospitalId: session.hospitalId } });
  if (!cardType) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={`Edit ${cardType.name}`} />
      <Panel className="p-6">
        <EditCardTypeForm cardType={cardType} />
      </Panel>
    </div>
  );
}
