"use client";

import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Briefcase, CalendarPlus, Clock, Heart, Languages, MapPin, MessageCircle, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { CAMPUS_FRANCE_NOTICE, DAYS, domainById, FORMATS, OPPORTUNITY_KINDS, RESOURCE_KINDS } from "@/lib/domains";
import { activeMentees, mentorRating, nextSlots } from "@/lib/matching";
import { cn, formatDate, plural } from "@/lib/utils";
import { Avatar, btn, DomainBadge, Eyebrow, Stars, Verified } from "@/components/ui";
import { BookingModal, EndMentorshipModal, FORMAT_ICONS, RequestModal } from "@/components/mentoring";

export default function MentorPage() {
  return (
    <Suspense>
      <MentorProfile />
    </Suspense>
  );
}

function MentorProfile() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { state, me, toggleFavorite } = useStore();
  const [requestOpen, setRequestOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const mentor = state.users.find((u) => u.id === id && u.role === "mentor");

  const ship = me ? state.mentorships.find((m) => m.mentorId === id && m.menteeId === me.id && (m.status === "active" || m.status === "en-attente")) : undefined;
  const active = ship?.status === "active";

  useEffect(() => {
    if (params.get("reserver") && active) setBookingOpen(true);
  }, [params, active]);

  if (!mentor) return notFound();

  const r = mentorRating(state, mentor.id);
  const free = (mentor.capacity ?? 3) - activeMentees(state, mentor.id);
  const reviews = state.sessions.filter((s) => s.mentorId === mentor.id && s.review).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const resources = state.resources.filter((x) => x.authorId === mentor.id);
  const opportunities = state.opportunities.filter((x) => x.authorId === mentor.id);
  const slots = nextSlots(state, mentor, 4);
  const fav = me ? (state.favorites[me.id] ?? []).includes(mentor.id) : false;
  const isMe = me?.id === mentor.id;
  const canAsk = me?.role === "mentore";

  return (
    <div className="animate-apparition">
      <Link href="/mentors" className={btn.quiet + " -ml-3 mb-4"}>
        <ArrowLeft size={15} /> Les mentors
      </Link>

      <header className="overflow-hidden rounded-2xl bg-papier shadow-doux">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${mentor.domains.map((d) => domainById(d)?.color ?? mentor.color).join(", ")}${mentor.domains.length < 2 ? ", " + mentor.color : ""})` }} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar user={mentor} size="xl" />
              <div>
                <h1 className="flex items-center gap-2 font-serif text-2xl leading-tight sm:text-[1.75rem]">
                  {mentor.name} <Verified user={mentor} size={22} />
                </h1>
                <p className="mt-1 text-nuit-500">
                  {mentor.title} · <span className="font-medium">{mentor.organization}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-nuit-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} /> {mentor.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase size={14} /> {mentor.years} ans d&apos;expérience
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Languages size={14} /> {mentor.languages?.join(", ")}
                  </span>
                </div>
              </div>
            </div>
            {canAsk && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => toggleFavorite(mentor.id)} className={btn.ghost + " px-3"} aria-pressed={fav} aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}>
                  <Heart size={17} className={fav ? "fill-terracotta text-terracotta" : ""} />
                </button>
                {active ? (
                  <>
                    <Link href={`/messages?avec=${mentor.id}`} className={btn.ghost}>
                      <MessageCircle size={16} /> Écrire
                    </Link>
                    <button onClick={() => setBookingOpen(true)} className={btn.accent}>
                      <CalendarPlus size={16} /> Demander une séance
                    </button>
                    <button onClick={() => setEndOpen(true)} className={btn.quiet}>
                      Clôturer le mentorat
                    </button>
                  </>
                ) : ship ? (
                  <span className="inline-flex items-center rounded-full bg-beige px-4 py-2.5 text-sm font-semibold text-nuit-500">Demande envoyée, en attente…</span>
                ) : (
                  <button onClick={() => setRequestOpen(true)} disabled={free <= 0} className={btn.accent}>
                    <Send size={16} /> {free > 0 ? "Demander un mentorat" : "Complet pour le moment"}
                  </button>
                )}
              </div>
            )}
            {isMe && (
              <Link href="/profil" className={btn.ghost}>
                Modifier mon profil
              </Link>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6 border-t border-beige-dark pt-6 sm:grid-cols-4">
            <div>
              <p className="font-serif text-2xl font-semibold">{r.count ? r.avg.toFixed(1) : "–"}</p>
              <Stars value={r.avg} size={12} />
              <p className="text-xs text-nuit-500">{plural(r.count, "avis", "avis")}</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-semibold">{r.sessions}</p>
              <p className="text-xs text-nuit-500">séances réalisées</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-semibold">{activeMentees(state, mentor.id)}</p>
              <p className="text-xs text-nuit-500">mentorés accompagnés</p>
            </div>
            <div>
              <p className={cn("font-serif text-2xl font-semibold", free > 0 ? "text-sauge-dark" : "text-nuit-500")}>{Math.max(0, free)}</p>
              <p className="text-xs text-nuit-500">places disponibles</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <section>
            <Eyebrow className="mb-2">Son parcours</Eyebrow>
            <p className="max-w-prose text-[1.02rem] leading-relaxed text-encre">{mentor.bio}</p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-lg">Domaines d&apos;accompagnement</h2>
            <div className="space-y-3">
              {mentor.domains.map((d) => {
                const dom = domainById(d)!;
                return (
                  <div key={d} className="rounded-2xl bg-papier p-5 shadow-doux">
                    <DomainBadge id={d} long />
                    <ul className="mt-3 grid gap-1.5 text-sm text-encre sm:grid-cols-2">
                      {dom.topics.map((t) => (
                        <li key={t} className="flex gap-2">
                          <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dom.color }} /> {t}
                        </li>
                      ))}
                    </ul>
                    {d === "campus-france" && <p className="mt-3 rounded-xl bg-beige/60 px-3 py-2 text-xs leading-relaxed text-encre">NB : {CAMPUS_FRANCE_NOTICE}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-lg">Compétences</h2>
            <div className="flex flex-wrap gap-2">
              {(mentor.skills ?? []).map((s) => (
                <span key={s} className="rounded-full border border-beige-dark bg-papier px-3 py-1.5 text-sm">
                  {s}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-lg">Avis des mentorés</h2>
            {reviews.length === 0 && <p className="text-sm text-nuit-500">Pas encore d&apos;avis : soyez le premier ou la première à être accompagné·e.</p>}
            <div className="space-y-3">
              {reviews.map((s) => {
                const mentee = state.users.find((u) => u.id === s.menteeId);
                return (
                  <figure key={s.id} className="rounded-2xl bg-papier p-5 shadow-doux">
                    <div className="flex items-center justify-between gap-3">
                      <figcaption className="flex items-center gap-2 text-sm">
                        <Avatar user={mentee} size="sm" />
                        <span className="font-semibold">{mentee?.name}</span>
                        <span className="text-nuit-500">· {s.topic}</span>
                      </figcaption>
                      <Stars value={s.rating ?? 0} size={13} />
                    </div>
                    <blockquote className="mt-3 text-[0.95rem] leading-relaxed text-encre">« {s.review} »</blockquote>
                  </figure>
                );
              })}
            </div>
          </section>

          {(resources.length > 0 || opportunities.length > 0) && (
            <section>
              <h2 className="mb-4 font-serif text-lg">Partagé par {mentor.name.split(" ")[0]}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {resources.map((x) => (
                  <Link key={x.id} href={`/ressources/${x.id}`} className="rounded-2xl bg-papier p-5 shadow-doux transition hover:shadow-lg">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: domainById(x.domain)?.color }}>
                      {RESOURCE_KINDS[x.kind]} · {x.minutes} min
                    </p>
                    <p className="mt-1 font-serif text-base leading-tight">{x.title}</p>
                  </Link>
                ))}
                {opportunities.map((o) => (
                  <Link key={o.id} href={`/opportunites#${o.id}`} className="rounded-2xl bg-beige/60 p-5 transition hover:bg-beige">
                    <p className="text-xs font-semibold uppercase tracking-wider text-nuit-500">{OPPORTUNITY_KINDS[o.kind]}</p>
                    <p className="mt-1 font-serif text-base leading-tight">{o.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl bg-papier p-5 shadow-doux">
            <h2 className="font-serif text-base">Disponibilités</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(mentor.formats ?? []).map((f) => {
                const Icon = FORMAT_ICONS[f];
                return (
                  <span key={f} className="inline-flex items-center gap-1 rounded-full bg-beige/70 px-2.5 py-1 text-xs font-medium">
                    <Icon size={13} /> {FORMATS[f]}
                  </span>
                );
              })}
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {(mentor.slots ?? [])
                .slice()
                .sort((a, b) => a.day - b.day || a.hour - b.hour)
                .map((s) => (
                  <li key={`${s.day}-${s.hour}`} className="flex items-center justify-between">
                    <span>{DAYS[s.day]}</span>
                    <span className="inline-flex items-center gap-1 text-nuit-500">
                      <Clock size={13} /> {String(s.hour).padStart(2, "0")}:00
                    </span>
                  </li>
                ))}
            </ul>
            {!mentor.slots?.length && <p className="mt-4 text-sm text-nuit-500">{mentor.name.split(" ")[0]} n&apos;a pas encore indiqué ses créneaux. Écrivez-lui pour convenir d&apos;un horaire : elle ou il pourra programmer la séance.</p>}
            {slots.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-nuit-500">Prochains créneaux libres</p>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((d) => (
                    <span key={d.toISOString()} className="rounded-lg bg-sauge-light px-2 py-1 text-xs font-medium capitalize text-sauge-dark">
                      {formatDate(d.toISOString(), { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ))}
                </div>
              </>
            )}
            {canAsk && active && (
              <button onClick={() => setBookingOpen(true)} className={btn.primary + " mt-5 w-full"}>
                <CalendarPlus size={16} /> Demander une séance
              </button>
            )}
          </section>
          <p className="px-2 text-xs leading-relaxed text-nuit-500">
            Le mentor accompagne, conseille et partage son expérience. Il ne se substitue pas à vous dans la réalisation de vos projets : il vous aide à gagner en autonomie et
            en capacité de décision.
          </p>
        </aside>
      </div>

      {me && canAsk && <RequestModal mentor={mentor} open={requestOpen} onClose={() => setRequestOpen(false)} />}
      {me && canAsk && active && <BookingModal mentor={mentor} mentee={me} open={bookingOpen} onClose={() => setBookingOpen(false)} />}
      {ship && active && <EndMentorshipModal mentorship={ship} other={mentor} open={endOpen} onClose={() => setEndOpen(false)} />}
    </div>
  );
}
