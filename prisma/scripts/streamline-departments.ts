// Prototype streamlining: keep only Doctor, Laboratory and Administration at
// every hospital. Departments with history (staff, requests, referrals,
// appointments, vacancies, notifications) are ARCHIVED — hidden, history kept,
// restorable under Admin → Departments. Departments with no history at all are
// deleted. Safe to run more than once.
//
//   npm run demo:streamline            (preview only — changes nothing)
//   npm run demo:streamline -- --apply (make the changes)

import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }) });
const apply = process.argv.includes("--apply");

const KEEP: Record<string, { name: string; description: string; acceptsRequestTypes?: string[] }> = {
  clinician: { name: "Doctor", description: "Consultation, diagnosis and prescribing." },
  lab: { name: "Laboratory", description: "Laboratory tests and results." },
  administration: { name: "Administration", description: "Billing, discharge and hospital administration.", acceptsRequestTypes: ["Billing", "Discharge"] },
};

async function main() {
  const hospitals = await db.hospital.findMany({ orderBy: { name: "asc" } });
  for (const hospital of hospitals) {
    console.log(`\n${hospital.name}`);
    const departments = await db.department.findMany({
      where: { hospitalId: hospital.id },
      include: {
        _count: {
          select: {
            staff: true, requestsReceived: true, requestsSent: true, referralsSent: true,
            externalReferralsReceived: true, vacancies: true, appointments: true, notifications: true,
          },
        },
      },
    });
    for (const d of departments) {
      const keep = KEEP[d.slug];
      if (keep) {
        const data = {
          name: keep.name,
          description: keep.description,
          isArchived: false,
          archivedAt: null,
          ...(keep.acceptsRequestTypes ? { acceptsRequestTypes: keep.acceptsRequestTypes } : {}),
        };
        console.log(`  keep     ${d.name}${d.name !== keep.name ? ` → ${keep.name}` : ""}`);
        if (apply) await db.department.update({ where: { id: d.id }, data });
        continue;
      }
      if (d.isArchived) {
        console.log(`  already removed  ${d.name}`);
        continue;
      }
      const references = Object.values(d._count).reduce((sum, n) => sum + n, 0);
      if (references === 0) {
        console.log(`  delete   ${d.name} (no history)`);
        if (apply) await db.department.delete({ where: { id: d.id } });
      } else {
        console.log(`  archive  ${d.name} (${references} linked records kept)`);
        if (apply) await db.department.update({ where: { id: d.id }, data: { isArchived: true, archivedAt: new Date() } });
      }
    }
  }
  console.log(apply ? "\nDone." : "\nPreview only. Run again with --apply to make these changes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
