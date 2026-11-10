import type { Tone } from "@/components/ui/Badge";

export const BILL_STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  UNPAID: { label: "Unpaid", tone: "danger" },
  PARTIALLY_PAID: { label: "Part paid", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  VOID: { label: "Cancelled", tone: "neutral" },
};
