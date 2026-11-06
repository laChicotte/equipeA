"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarPlus, Check, MapPin, MessageCircle } from "lucide-react";
import { goalProgress, useStore } from "@/lib/store";
import { domainById, PROFILES } from "@/lib/domains";
import { cn, formatDate } from "@/lib/utils";
import { Avatar, btn, DomainBadge, Eyebrow, field, Progress } from "@/components/ui";
import { BookingModal, EndMentorshipModal, SessionRow } from "@/components/mentoring";

export default function MembrePage() {
  const { id } = useParams<{ id: string }>();
  const { state, me, setMentorNote } = useStore();
  const [booking, setBooking] = useState(false);
  const [ending, setEnding] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const member = state.users.find((u) => u.id === id && u.role === "mentore");
  if (!member) return notFound();
  if (!me) return null;

  const ship = state.mentorships.find((m) => m.menteeId === member.id && m.mentorId === me.id && m.status === "active");
  const goals = state.goals.filter((g) => g.userId === member.id && (g.mentorId === me.id || !!ship));
  const sessions = state.sessions.filter((s) => s.menteeId === member.id && s.mentorId === me.id).sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <div className="animate-apparition">
      <Link href="/accueil" className={btn.quiet + " -ml-3 mb-4"}>
        <ArrowLeft size={15} /> Retour
      </Link>
      <header className="flex flex-col gap-5 rounded-2xl bg-papier p-6 shadow-doux sm:flex-row sm:items-center sm:p-8">
        <Avatar user={member} size="xl" />
        <div className="min-w-0 flex-1">
          <Eyebrow>{member.profile ? PROFILES[member.profile].label : "Membre"}</Eyebrow>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl">{member.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-nuit-500">
            <MapPin size={14} /> {member.city}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {member.domains.map((d) => (
              <DomainBadge key={d} id={d} />
            ))}
          </div>
        </div>
        {ship && (
          <div className="flex gap-2">
            <Link href={`/messages?avec=${member.id}`} className={btn.ghost}>
              <MessageCircle size={16} /> Écrire
            </Link>
            <button onClick={() => setBooking(true)} className={btn.accent}>
              <CalendarPlus size={16} /> Planifier
            </button>
            <button onClick={() => setEnding(true)} className={btn.quiet}>
              Clôturer
            </button>
          </div>
        )}
      </header>

      {member.need && (
        <section className="mt-8">
          <Eyebrow className="mb-2">Son besoin, avec ses mots</Eyebrow>
          <p className="font-serif text-xl leading-relaxed">« {member.need} »</p>
          {member.bio && <p className="mt-3 text-encre">{member.bio}</p>}
        </section>
      )}

      {goals.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-serif text-lg">Objectifs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((g) => {
              const p = goalProgress(g);
              const d = domainById(g.domain);
              const mine = g.mentorId === me.id;
              return (
                <article key={g.id} className="rounded-2xl bg-papier p-5 shadow-doux">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-serif text-base leading-tight">{g.title}</p>
                    <span className="font-serif text-xl font-semibold" style={{ color: d?.color }}>
                      {p.pct} %
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-nuit-500">Échéance : {formatDate(g.dueAt)}</p>
                  <Progress value={p.done} max={p.total} color={d?.color} className="mt-3" thin />
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {g.steps.map((s) => (
                      <li key={s.id} className={cn("flex items-start gap-2", s.done && "text-nuit-500 line-through")}>
                        <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", s.done ? "border-sauge bg-sauge text-white" : "border-beige-dark")}>{s.done && <Check size={11} />}</span>
                        {s.text}
                      </li>
                    ))}
                  </ul>
                  {mine && (
                    <form
                      className="mt-4 border-t border-beige pt-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const note = (notes[g.id] ?? g.mentorNote ?? "").trim();
                        if (note) setMentorNote(g.id, note);
                      }}
                    >
                      <label className="block text-xs font-semibold uppercase tracking-wider text-nuit-500" htmlFor={`note-${g.id}`}>
                        Mon conseil sur cet objectif
                      </label>
                      <textarea id={`note-${g.id}`} rows={2} value={notes[g.id] ?? g.mentorNote ?? ""} onChange={(e) => setNotes({ ...notes, [g.id]: e.target.value })} className={field + " mt-2 resize-none text-sm"} placeholder="Un encouragement, une piste…" />
                      <button type="submit" className={btn.primary + " mt-2 py-2"}>
                        Envoyer
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-serif text-lg">Nos séances</h2>
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {ship && <BookingModal mentor={me} mentee={member} open={booking} onClose={() => setBooking(false)} />}
      {ship && <EndMentorshipModal mentorship={ship} other={member} open={ending} onClose={() => setEnding(false)} />}
    </div>
  );
}
