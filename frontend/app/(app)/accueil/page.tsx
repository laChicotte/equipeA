"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Library,
  MessageCircle,
  PartyPopper,
  Sparkles,
  Star,
  Target,
  Video,
  X,
} from "lucide-react";
import { goalProgress, myMentorships, mySessions, partnerOf, useStore } from "@/lib/store";
import { domainById, OPPORTUNITY_KINDS } from "@/lib/domains";
import { mentorRating, recommendMentors } from "@/lib/matching";
import type { Session, User } from "@/lib/types";
import { cn, daysLeft, formatDate, timeAgo } from "@/lib/utils";
import { Avatar, btn, DomainBadge, EmptyState, profileHref, Progress, Stars, Verified } from "@/components/ui";
import { FORMAT_ICONS, SessionRow } from "@/components/mentoring";
import { Composer, Feed, MentorSuggestions, Panel, ProfileCard, Shortcuts, StatsList } from "@/components/home-layout";

export default function Accueil() {
  const { me } = useStore();
  if (!me) return null;
  return me.role === "mentor" ? <MentorHome me={me} /> : <MenteeHome me={me} />;
}

function greeting() {
  return new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
}

/** Trois colonnes : identité à gauche, fil au centre, suggestions à droite (le fil passe en premier sur téléphone). */
function ThreeColumns({ left, center, right }: { left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid animate-apparition grid-cols-1 items-start gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[15.5rem_minmax(0,1fr)_19rem]">
      <aside className="order-3 space-y-4 lg:sticky lg:top-24 lg:order-1">{left}</aside>
      <div className="order-1 min-w-0 space-y-4 lg:order-2">{center}</div>
      <aside className="order-2 space-y-4 lg:order-3 lg:col-start-1 xl:sticky xl:top-24 xl:col-start-3 xl:row-start-1">{right}</aside>
    </div>
  );
}

function NextSession({ session, me }: { session?: Session; me: User }) {
  const { state } = useStore();
  if (!session)
    return (
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-nuit p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-white/60">Prochaine séance</p>
          <p className="mt-1 font-serif text-lg">Aucune séance planifiée</p>
        </div>
        <Link href={me.role === "mentor" ? "/seances" : "/mentors"} className={btn.accent}>
          {me.role === "mentor" ? "Voir mon agenda" : "Demander une séance"}
        </Link>
      </section>
    );
  const other = state.users.find((u) => u.id === (session.mentorId === me.id ? session.menteeId : session.mentorId));
  const Icon = FORMAT_ICONS[session.format];
  const days = daysLeft(session.startsAt);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-nuit p-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(201,98,63,0.38),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(47,93,138,0.35),transparent_45%)]" />
      <p className="relative flex items-center gap-2 text-sm text-white/60">
        <Clock size={15} className="text-terracotta-light" />
        Prochaine séance · {days === 0 ? "aujourd'hui" : days === 1 ? "demain" : `dans ${days} jours`}
      </p>
      <div className="relative mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-serif text-xl leading-tight">{session.topic}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
            <span className="inline-flex items-center gap-2">
              <Avatar user={other} size="xs" /> {other?.name}
            </span>
            <span className="capitalize">{formatDate(session.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="inline-flex items-center gap-1">
              <Icon size={14} /> {session.duration} min
            </span>
          </p>
        </div>
        {session.format === "visio" ? (
          <Link href={`/visio/${session.id}`} className={btn.accent + " shrink-0"}>
            <Video size={17} /> Rejoindre la visio
          </Link>
        ) : (
          <Link href={`/messages?avec=${other?.id}`} className={btn.accent + " shrink-0"}>
            <MessageCircle size={17} /> Ouvrir le chat
          </Link>
        )}
      </div>
    </section>
  );
}

function AgendaPanel({ sessions, me, title = "À l'agenda" }: { sessions: Session[]; me: User; title?: string }) {
  const { state } = useStore();
  return (
    <Panel
      title={title}
      action={
        <Link href="/seances" className="text-xs font-medium text-nuit-500 hover:text-nuit">
          Tout voir
        </Link>
      }
    >
      {sessions.length === 0 && <p className="text-sm text-nuit-500">Aucune autre séance à venir.</p>}
      <ul className="space-y-3">
        {sessions.map((s) => {
          const other = state.users.find((u) => u.id === (s.mentorId === me.id ? s.menteeId : s.mentorId));
          return (
            <li key={s.id}>
              <Link href="/seances" className="flex items-center gap-3">
                <span className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-ciel-light py-1 text-ciel">
                  <span className="text-[0.6rem] font-semibold uppercase">{formatDate(s.startsAt, { month: "short" }).replace(".", "")}</span>
                  <span className="text-sm font-semibold leading-none">{new Date(s.startsAt).getDate()}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-nuit">{s.topic}</span>
                  <span className="flex items-center gap-1.5 text-xs text-nuit-500">
                    <Avatar user={other} size="xs" />
                    {formatDate(s.startsAt, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ---------------------------------------------------------------- Mentoré */

function MenteeHome({ me }: { me: User }) {
  const { state } = useStore();
  const ships = myMentorships(state, me).filter((m) => m.status === "active" || m.status === "en-attente");
  const sessions = mySessions(state, me.id);
  const upcoming = sessions.filter((s) => s.status === "planifiee" && new Date(s.startsAt) > new Date(Date.now() - 3600_000)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const done = sessions.filter((s) => s.status === "terminee");
  const toRate = done.filter((s) => !s.rating);
  const goals = state.goals.filter((g) => g.userId === me.id);
  const stepsDone = goals.reduce((n, g) => n + goalProgress(g).done, 0);
  const stepsTotal = goals.reduce((n, g) => n + goalProgress(g).total, 0);
  const mine = new Set(ships.map((m) => m.mentorId));
  const recos = recommendMentors(state, me)
    .filter((m) => !mine.has(m.mentor.id))
    .slice(0, 3);
  const opportunities = state.opportunities
    .filter((o) => me.domains.includes(o.domain) && new Date(o.deadline) > new Date())
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);

  const left = (
    <>
      <ProfileCard me={me} />
      <StatsList
        rows={[
          { label: "Mentors", value: ships.filter((m) => m.status === "active").length, href: "/mentors" },
          { label: "Séances réalisées", value: done.length, href: "/seances" },
          { label: "Étapes franchies", value: `${stepsDone}/${stepsTotal}`, href: "/objectifs" },
          { label: "Opportunités suivies", value: state.opportunities.filter((o) => o.interested.includes(me.id)).length, href: "/opportunites" },
        ]}
      />
      <Panel
        title="Mes mentors"
        action={
          <Link href="/mentors" className="text-xs font-medium text-nuit-500 hover:text-nuit">
            Voir
          </Link>
        }
      >
        {ships.length === 0 && <p className="text-sm text-nuit-500">Pas encore de mentor.</p>}
        <ul className="space-y-3">
          {ships.map((m) => {
            const mentor = state.users.find((u) => u.id === m.mentorId)!;
            return (
              <li key={m.id} className="flex items-center gap-2.5">
                <Link href={`/mentors/${mentor.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar user={mentor} size="sm" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-sm font-medium text-nuit">
                      {mentor.name} <Verified user={mentor} size={12} />
                    </span>
                    <span className="block truncate text-xs text-nuit-500">{m.status === "en-attente" ? "Demande en attente" : domainById(m.domain)?.short}</span>
                  </span>
                </Link>
                {m.status === "active" && (
                  <Link href={`/messages?avec=${mentor.id}`} className="rounded-lg p-1.5 text-nuit-500 hover:bg-creme hover:text-nuit" aria-label={`Écrire à ${mentor.name}`}>
                    <MessageCircle size={16} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Shortcuts
        links={[
          { href: "/seances", label: "Mes séances", icon: CalendarDays, tone: "bg-ciel-light text-ciel" },
          { href: "/objectifs", label: "Mes objectifs", icon: Target, tone: "bg-sauge-light text-sauge-dark" },
          { href: "/ressources", label: "Bibliothèque", icon: Library, tone: "bg-terracotta-light text-terracotta-dark" },
          { href: "/opportunites", label: "Opportunités", icon: Briefcase, tone: "bg-or-light text-or" },
        ]}
      />
    </>
  );

  const center = (
    <>
      <h1 className="sr-only">Accueil</h1>
      <Composer
        me={me}
        prompt={`${greeting()} ${me.name.split(" ")[0]}, de quoi avez-vous besoin ?`}
        href="/mentors/trouver"
        actions={[
          { href: "/mentors/trouver", label: "Trouver un mentor", short: "Mentor", icon: Sparkles, color: "text-terracotta" },
          { href: "/seances", label: "Séance", icon: CalendarPlus, color: "text-ciel" },
          { href: "/objectifs?nouveau=1", label: "Objectif", icon: Target, color: "text-sauge-dark" },
        ]}
      />

      <NextSession session={upcoming[0]} me={me} />

      {toRate.length > 0 && (
        <Link href="/seances" className="flex items-center gap-3 rounded-2xl border border-terracotta/30 bg-terracotta-light/40 px-4 py-3 text-sm transition hover:bg-terracotta-light/70">
          <Star size={18} className="shrink-0 text-terracotta-dark" />
          <span className="flex-1">
            <span className="font-semibold">Évaluez votre séance « {toRate[0].topic} »</span> : votre avis aide les autres membres.
          </span>
          <ArrowRight size={16} />
        </Link>
      )}

      <Panel
        title="Mes objectifs"
        action={
          <Link href="/objectifs" className="inline-flex items-center gap-1 text-xs font-medium text-nuit-500 hover:text-nuit">
            Tout voir <ArrowRight size={13} />
          </Link>
        }
      >
        {goals.length === 0 ? (
          <EmptyState title="Aucun objectif" text="Un objectif clair, découpé en étapes, est le meilleur point de départ d'un mentorat." action={<Link href="/objectifs?nouveau=1" className={btn.primary}>Créer un objectif</Link>} />
        ) : (
          <ul className="divide-y divide-beige-dark">
            {goals.slice(0, 3).map((g) => {
              const p = goalProgress(g);
              const d = domainById(g.domain);
              const nextStep = g.steps.find((s) => !s.done);
              return (
                <li key={g.id}>
                  <Link href={`/objectifs#${g.id}`} className="block py-3.5 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[0.95rem] font-medium leading-snug text-nuit">{g.title}</p>
                        <p className="mt-0.5 text-sm text-nuit-500">
                          {nextStep ? (
                            `Prochaine étape : ${nextStep.text}`
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-medium text-sauge-dark">
                              <PartyPopper size={15} /> Objectif atteint
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: d?.color }}>
                        {p.pct} %
                      </span>
                    </div>
                    <Progress value={p.done} max={p.total} color={d?.color} className="mt-3" thin />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Feed me={me} />
    </>
  );

  const right = (
    <>
      <MentorSuggestions matches={recos} />
      <Panel
        title="Opportunités pour vous"
        action={
          <Link href="/opportunites" className="text-xs font-medium text-nuit-500 hover:text-nuit">
            Voir
          </Link>
        }
      >
        {opportunities.length === 0 && <p className="text-sm text-nuit-500">Rien de nouveau dans vos domaines pour le moment.</p>}
        <div className="divide-y divide-beige-dark">
          {opportunities.map((o) => (
            <Link key={o.id} href={`/opportunites#${o.id}`} className="block py-3 first:pt-0 last:pb-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: domainById(o.domain)?.color }}>
                {OPPORTUNITY_KINDS[o.kind]}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-nuit hover:underline">{o.title}</p>
              <p className="mt-0.5 text-xs text-nuit-500">jusqu&apos;au {formatDate(o.deadline)}</p>
            </Link>
          ))}
        </div>
      </Panel>
      {upcoming.length > 1 && <AgendaPanel sessions={upcoming.slice(1, 4)} me={me} />}
    </>
  );

  return <ThreeColumns left={left} center={center} right={right} />;
}

/* ---------------------------------------------------------------- Mentor */

function MentorHome({ me }: { me: User }) {
  const { state, respondMentorship } = useStore();
  const pending = state.mentorships.filter((m) => m.mentorId === me.id && m.status === "en-attente");
  const active = state.mentorships.filter((m) => m.mentorId === me.id && m.status === "active");
  const sessions = mySessions(state, me.id);
  const upcoming = sessions.filter((s) => s.status === "planifiee" && new Date(s.startsAt) > new Date(Date.now() - 3600_000)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const sessionRequests = sessions.filter((s) => s.status === "demandee" && s.mentorId === me.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const rating = mentorRating(state, me.id);
  const reviews = sessions.filter((s) => s.review && s.mentorId === me.id).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const published = state.resources.filter((r) => r.authorId === me.id).length + state.opportunities.filter((o) => o.authorId === me.id).length;

  const left = (
    <>
      <ProfileCard me={me} />
      <StatsList
        rows={[
          { label: "Mentorés", value: `${active.length}/${me.capacity ?? 3}`, href: "/accueil#mentores" },
          { label: "Séances réalisées", value: rating.sessions, href: "/seances" },
          { label: "Note moyenne", value: rating.count ? `${rating.avg.toFixed(1)}/5` : "–", href: "/profil" },
          { label: "Publications", value: published, href: "/ressources" },
        ]}
      />
      <Shortcuts
        links={[
          { href: "/seances", label: "Mon agenda", icon: CalendarDays, tone: "bg-ciel-light text-ciel" },
          { href: "/ressources/nouvelle", label: "Partager une ressource", icon: Library, tone: "bg-terracotta-light text-terracotta-dark" },
          { href: "/opportunites?nouveau=1", label: "Publier une opportunité", icon: Briefcase, tone: "bg-or-light text-or" },
          { href: "/profil", label: "Mes disponibilités", icon: Clock, tone: "bg-sauge-light text-sauge-dark" },
        ]}
      />
    </>
  );

  const center = (
    <>
      <h1 className="sr-only">Accueil</h1>
      <Composer
        me={me}
        prompt={`${greeting()} ${me.name.split(" ")[0]}, partagez votre expérience…`}
        href="/ressources/nouvelle"
        actions={[
          { href: "/ressources/nouvelle", label: "Ressource", icon: Library, color: "text-ciel" },
          { href: "/opportunites?nouveau=1", label: "Opportunité", icon: Briefcase, color: "text-or" },
          { href: "/seances", label: "Séance", icon: CalendarPlus, color: "text-sauge-dark" },
        ]}
      />

      {pending.length > 0 && (
        <Panel title={`Demandes de mentorat (${pending.length})`}>
          <div className="space-y-3">
            {pending.map((m) => {
              const mentee = state.users.find((u) => u.id === m.menteeId)!;
              return (
                <article key={m.id} className="rounded-xl border-l-4 border-terracotta bg-terracotta-light/25 p-4">
                  <Link href={profileHref(mentee)} className="flex items-center gap-3">
                    <Avatar user={mentee} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-nuit">{mentee.name}</p>
                      <p className="text-xs text-nuit-500">
                        {mentee.city} · {timeAgo(m.createdAt)}
                      </p>
                    </div>
                    <DomainBadge id={m.domain} className="ml-auto" />
                  </Link>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-encre">« {m.message} »</p>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button onClick={() => respondMentorship(m.id, false)} className={btn.ghost}>
                      <X size={16} /> Décliner
                    </button>
                    <button onClick={() => respondMentorship(m.id, true)} className={btn.accent}>
                      <Check size={16} /> Accepter
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      )}

      {!(me.slots?.length && me.formats?.length) && (
        <Link href="/profil" className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-terracotta/40 bg-terracotta-light/40 p-5 transition hover:bg-terracotta-light/70">
          <Clock size={22} className="shrink-0 text-terracotta-dark" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Indiquez vos disponibilités</span>
            <span className="block text-sm text-encre">Vos mentorés ne peuvent pas encore vous demander de séance : choisissez vos créneaux et vos formats dans votre profil.</span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-terracotta-dark" />
        </Link>
      )}

      {sessionRequests.length > 0 && (
        <Panel
          title={`Séances à valider (${sessionRequests.length})`}
          action={
            <Link href="/seances" className="text-xs font-medium text-nuit-500 hover:text-nuit">
              Mon agenda
            </Link>
          }
        >
          <div className="space-y-3">
            {sessionRequests.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </Panel>
      )}

      <NextSession session={upcoming[0]} me={me} />

      <Panel title="Mes mentorés" className="scroll-mt-24">
        <div id="mentores" />
        {active.length === 0 ? (
          <EmptyState title="Aucun mentoré pour l'instant" text="Les demandes arrivent ici. Complétez votre profil pour être mieux recommandé·e." action={<Link href="/profil" className={btn.primary}>Compléter mon profil</Link>} />
        ) : (
          <ul className="divide-y divide-beige-dark">
            {active.map((m) => {
              const mentee = state.users.find((u) => u.id === partnerOf(m, me.id))!;
              const goals = state.goals.filter((g) => g.userId === mentee.id && g.mentorId === me.id);
              const next = upcoming.find((s) => s.menteeId === mentee.id);
              return (
                <li key={m.id} className="py-4 first:pt-1 last:pb-1">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={profileHref(mentee)} className="flex min-w-0 items-center gap-3">
                      <Avatar user={mentee} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-nuit hover:underline">{mentee.name}</p>
                        <p className="text-xs text-nuit-500">Accompagné·e depuis {timeAgo(m.acceptedAt ?? m.createdAt).replace("il y a ", "")}</p>
                      </div>
                    </Link>
                    <Link href={`/messages?avec=${mentee.id}`} className="rounded-lg p-2 text-nuit-500 hover:bg-creme hover:text-nuit" aria-label={`Écrire à ${mentee.name}`}>
                      <MessageCircle size={18} />
                    </Link>
                  </div>
                  {goals.map((g) => {
                    const p = goalProgress(g);
                    return (
                      <div key={g.id} className="mt-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-encre">{g.title}</span>
                          <span className="shrink-0 text-xs text-nuit-500">
                            {p.done}/{p.total} étapes
                          </span>
                        </div>
                        <Progress value={p.done} max={p.total} color={domainById(g.domain)?.color} className="mt-1.5" thin />
                      </div>
                    );
                  })}
                  <p className={cn("mt-3 flex items-center gap-1.5 text-xs", next ? "text-sauge-dark" : "text-nuit-500")}>
                    <CalendarCheck size={13} />
                    {next ? `Prochaine séance : ${formatDate(next.startsAt, { weekday: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Aucune séance planifiée"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Feed me={me} limit={4} />
    </>
  );

  const right = (
    <>
      <AgendaPanel sessions={upcoming.slice(0, 4)} me={me} title="Agenda" />
      <Panel title="Derniers avis">
        {reviews.length === 0 && <p className="text-sm text-nuit-500">Vos premiers avis apparaîtront ici.</p>}
        <div className="space-y-4">
          {reviews.slice(0, 3).map((s) => {
            const mentee = state.users.find((u) => u.id === s.menteeId);
            return (
              <figure key={s.id}>
                <blockquote className="text-sm leading-relaxed text-encre">« {s.review} »</blockquote>
                <figcaption className="mt-1.5 flex items-center gap-2 text-xs text-nuit-500">
                  <Stars value={s.rating ?? 0} size={12} /> {mentee?.name}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </Panel>
    </>
  );

  return <ThreeColumns left={left} center={center} right={right} />;
}
