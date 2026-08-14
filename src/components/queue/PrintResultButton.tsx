"use client";

import { Button } from "@/components/ui/Button";

export function PrintResultButton() {
  return (
    <Button variant="secondary" size="sm" className="justify-start" onClick={() => window.print()}>
      Print result
    </Button>
  );
}
