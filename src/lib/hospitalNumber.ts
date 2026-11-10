import { db } from "@/lib/db";

// Issues the next sequential hospital number for a card type's series in the
// current year, e.g. GOP/2026/00412. Uses an atomic upsert+increment so
// concurrent registrations under the same card type never collide.
export async function issueHospitalNumber(cardTypeId: string, hospitalId: string): Promise<string> {
  const cardType = await db.cardType.findFirstOrThrow({ where: { id: cardTypeId, hospitalId } });
  const year = new Date().getFullYear();

  const counter = await db.$transaction(async (tx) => {
    const existing = await tx.hospitalNumberCounter.findUnique({
      where: { cardTypeId_year: { cardTypeId, year } },
    });

    if (existing) {
      return tx.hospitalNumberCounter.update({
        where: { id: existing.id },
        data: { lastNumber: existing.lastNumber + 1 },
      });
    }

    return tx.hospitalNumberCounter.create({
      data: { cardTypeId, year, lastNumber: 1 },
    });
  });

  const serial = String(counter.lastNumber).padStart(5, "0");
  return `${cardType.seriesCode}/${year}/${serial}`;
}
