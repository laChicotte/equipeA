"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { DAYS } from "@/lib/domains";
import type { Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { btn, field } from "./ui";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 → 21:00
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * Créneaux hebdomadaires du mentor : c'est sur ces créneaux que ses mentorés demandent une séance.
 * On choisit une heure et un ou plusieurs jours, puis on ajoute.
 */
export function SlotsEditor({ slots, onChange }: { slots: Slot[]; onChange: (slots: Slot[]) => void }) {
  const [days, setDays] = useState<number[]>([]);
  const [hour, setHour] = useState(18);

  const add = () => {
    const fresh = days.filter((day) => !slots.some((s) => s.day === day && s.hour === hour)).map((day) => ({ day, hour }));
    if (fresh.length) onChange([...slots, ...fresh]);
    setDays([]);
  };

  return (
    <div>
      {slots.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {slots
            .slice()
            .sort((a, b) => a.day - b.day || a.hour - b.hour)
            .map((s) => (
              <span key={`${s.day}-${s.hour}`} className="inline-flex items-center gap-1 rounded-full bg-sauge-light py-1 pl-3 pr-1 text-sm text-sauge-dark">
                {DAYS[s.day]} {hh(s.hour)}
                <button type="button" onClick={() => onChange(slots.filter((x) => x !== s))} className="rounded-full p-1 hover:bg-white/60" aria-label={`Retirer ${DAYS[s.day]} ${hh(s.hour)}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-terracotta-light/50 px-4 py-2.5 text-sm text-terracotta-dark">Aucun créneau pour l&apos;instant : vos mentorés ne pourront pas vous demander de séance.</p>
      )}

      <div className="mt-3 rounded-2xl bg-beige/50 p-3">
        <p className="mb-2 text-xs font-medium text-nuit-500">Ajouter un créneau : choisissez le ou les jours, puis l&apos;heure</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jours">
          {DAYS.slice(1).map((d, i) => {
            const day = i + 1;
            const on = days.includes(day);
            return (
              <button
                type="button"
                key={d}
                onClick={() => setDays(on ? days.filter((x) => x !== day) : [...days, day])}
                aria-pressed={on}
                className={cn("rounded-full border px-3 py-1 text-sm font-medium transition", on ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
              >
                {d.slice(0, 3)}.
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <select value={hour} onChange={(e) => setHour(+e.target.value)} className={field + " w-auto py-2"} aria-label="Heure">
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {hh(h)}
              </option>
            ))}
          </select>
          <button type="button" onClick={add} disabled={days.length === 0} className={btn.ghost + " py-2"}>
            <Plus size={15} /> Ajouter {days.length > 1 ? `${days.length} créneaux` : "le créneau"}
          </button>
        </div>
      </div>
    </div>
  );
}
