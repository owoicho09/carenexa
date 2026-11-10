"use client";

import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { switchHospitalAction } from "@/app/(dashboard)/hospitalActions";

type HospitalOption = { id: string; name: string; accent: string };

function ToggleButtons({ hospitals, currentHospitalId }: { hospitals: HospitalOption[]; currentHospitalId: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      {hospitals.map((hospital) => {
        const active = hospital.id === currentHospitalId;
        return (
          <button
            key={hospital.id}
            type="submit"
            name="hospitalId"
            value={hospital.id}
            disabled={active || pending}
            aria-pressed={active}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-default"
            style={active ? { backgroundColor: hospital.accent, color: "#fff" } : { color: "var(--color-text-muted)" }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? "#fff" : hospital.accent }} />
            {hospital.name}
          </button>
        );
      })}
    </>
  );
}

export function HospitalSwitcher({ hospitals, currentHospitalId }: { hospitals: HospitalOption[]; currentHospitalId: string }) {
  const pathname = usePathname();
  return (
    <form action={switchHospitalAction} className="flex items-center gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-page)] p-0.5" aria-label="Switch hospital">
      <input type="hidden" name="returnTo" value={pathname} />
      <ToggleButtons hospitals={hospitals} currentHospitalId={currentHospitalId} />
    </form>
  );
}
