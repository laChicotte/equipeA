"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Format, Session } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { FORMAT_ICONS } from "./mentoring";
import { Avatar } from "./ui";

/** Une couleur par format de séance, reprise de la palette d'appoint. */
const FORMAT_TONES: Record<Format, { label: string; card: string; dot: string; text: string }> = {
  visio: { label: "Visio", card: "bg-ciel-light border-ciel/25", dot: "bg-ciel", text: "text-ciel" },
  chat: { label: "Chat", card: "bg-sauge-light border-sauge-dark/25", dot: "bg-sauge-dark", text: "text-sauge-dark" },
  presentiel: { label: "Présentiel", card: "bg-or-light border-or/25", dot: "bg-or", text: "text-or" },
};

const DAY = 86_400_000;

/**
 * Frise des sept prochains jours : un fil relie les jours, aujourd'hui est marqué d'un cercle,
 * chaque séance s'accroche sous son jour (couleur = format, pointillés = en attente de validation).
 */
export function WeekRibbon({ sessions }: { sessions: Session[] }) {
  const { state, me } = useStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * DAY));
  const end = today.getTime() + 7 * DAY;

  const inWeek = sessions
    .filter((s) => (s.status === "planifiee" || s.status === "demandee") && new Date(s.startsAt).getTime() >= today.getTime() && new Date(s.startsAt).getTime() < end)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const confirmed = inWeek.filter((s) => s.status === "planifiee").length;
  const pending = inWeek.length - confirmed;
  const month = formatDate(today.toISOString(), { month: "long", year: "numeric" });
  const usedFormats = (Object.keys(FORMAT_TONES) as Format[]).filter((f) => inWeek.some((s) => s.format === f));

  const partnerOf = (s: Session) => state.users.find((u) => u.id === (s.mentorId === me?.id ? s.menteeId : s.mentorId));
  const hrefOf = (s: Session) => {
    if (s.status !== "planifiee") return undefined;
    if (s.format === "visio") return `/visio/${s.id}`;
    const p = partnerOf(s);
    return p ? `/messages?avec=${p.id}` : undefined;
  };

  return (
    <section aria-label="Ma semaine" className="mb-10 overflow-hidden rounded-2xl bg-papier shadow-doux">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-beige-dark px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-terracotta-dark">Ma semaine</p>
          <p className="mt-0.5 font-serif text-lg capitalize">{month}</p>
        </div>
        <p className="text-sm text-nuit-500">
          {inWeek.length === 0 ? (
            "Aucune séance d'ici sept jours"
          ) : (
            <>
              <span className="font-semibold text-nuit">{confirmed}</span> séance{confirmed > 1 ? "s" : ""} confirmée{confirmed > 1 ? "s" : ""}
              {pending > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-terracotta-dark">{pending}</span> en attente
                </>
              )}
            </>
          )}
        </p>
      </header>

      <div className="relative px-2 pb-5 pt-5 sm:px-4">
        {/* Le fil de la semaine, qui passe au centre des numéros de jour */}
        <div aria-hidden className="absolute left-[7%] right-[7%] top-[3.95rem] h-px bg-gradient-to-r from-terracotta/60 via-beige-dark to-beige-dark" />

        <ol className="relative grid grid-cols-7">
          {week.map((d, i) => {
            const isToday = i === 0;
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            const day = inWeek.filter((s) => new Date(s.startsAt).toDateString() === d.toDateString());
            return (
              <li key={d.toISOString()} className="flex min-w-0 flex-col items-center px-0.5 sm:px-1.5">
                <span className={cn("text-[0.65rem] font-semibold uppercase tracking-wider", isToday ? "text-terracotta-dark" : weekend ? "text-nuit-500/60" : "text-nuit-500")}>
                  {isToday ? "Auj." : formatDate(d.toISOString(), { weekday: "short" }).replace(".", "")}
                </span>
                <span
                  className={cn(
                    "relative mt-1.5 flex h-10 w-10 items-center justify-center rounded-full font-serif text-base tabular-nums",
                    isToday ? "bg-terracotta text-white shadow-[0_0_0_5px_var(--color-terracotta-light)]" : "bg-papier text-nuit ring-1 ring-beige-dark",
                    !isToday && day.length > 0 && "ring-2 ring-nuit/70",
                  )}
                >
                  {d.getDate()}
                </span>

                <div className="mt-3 flex w-full flex-col items-center gap-1.5">
                  {day.map((s) => {
                    const tone = FORMAT_TONES[s.format];
                    const Icon = FORMAT_ICONS[s.format];
                    const partner = partnerOf(s);
                    const waiting = s.status === "demandee";
                    const href = hrefOf(s);
                    const body = (
                      <>
                        {/* Téléphone : seulement l'avatar, cerclé de la couleur du format */}
                        <span className={cn("rounded-full p-0.5 lg:hidden", waiting ? "border border-dashed border-terracotta" : tone.dot)}>
                          <Avatar user={partner} size="sm" ring />
                        </span>
                        {/* Écran large : carte avec heure, format et sujet */}
                        <span className={cn("hidden w-full rounded-lg border px-2 py-1.5 text-left lg:block", waiting ? "border-dashed border-terracotta/60 bg-terracotta-light/40" : tone.card)}>
                          <span className={cn("flex items-center gap-1 text-[0.7rem] font-semibold tabular-nums", waiting ? "text-terracotta-dark" : tone.text)}>
                            <Icon size={11} />
                            {formatDate(s.startsAt, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="mt-1 flex items-start gap-1.5">
                            <Avatar user={partner} size="xs" />
                            <span className="line-clamp-2 text-xs font-medium leading-snug text-nuit">{s.topic}</span>
                          </span>
                        </span>
                      </>
                    );
                    const label = `${s.topic} · ${formatDate(s.startsAt, { weekday: "long", hour: "2-digit", minute: "2-digit" })}${waiting ? " (en attente de validation)" : ""}`;
                    return href ? (
                      <Link key={s.id} href={href} title={label} aria-label={label} className="flex w-full justify-center transition hover:-translate-y-0.5">
                        {body}
                      </Link>
                    ) : (
                      <span key={s.id} title={label} aria-label={label} className="flex w-full justify-center">
                        {body}
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {(usedFormats.length > 0 || pending > 0) && (
        <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-beige-dark px-5 py-3 text-xs text-nuit-500 sm:px-6">
          {usedFormats.map((f) => (
            <span key={f} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", FORMAT_TONES[f].dot)} /> {FORMAT_TONES[f].label}
            </span>
          ))}
          {pending > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-dashed border-terracotta" /> En attente de validation
            </span>
          )}
        </footer>
      )}
    </section>
  );
}
