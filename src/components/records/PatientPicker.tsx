"use client";

import { useState, useEffect, useRef } from "react";
import { searchPatients } from "@/app/(dashboard)/records/searchActions";
import { Input } from "@/components/ui/Field";

type PatientMatch = { id: string; fullName: string; hospitalNumber: string; phone: string };

export function PatientPicker({
  onSelect,
  placeholder = "Search by name, phone, or hospital number…",
}: {
  onSelect: (patient: PatientMatch) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (query.trim().length < 2) {
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      const matches = await searchPatients(query);
      setResults(matches);
      setLoading(false);
    }, 250);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  return (
    <div>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} autoFocus />
      {query.trim().length >= 2 && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-[var(--color-border)]">
          {loading ? (
            <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">No matches.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-page)]"
              >
                <span className="font-medium text-[var(--color-text)]">{p.fullName}</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">{p.hospitalNumber}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
