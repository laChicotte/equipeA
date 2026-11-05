"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Briefcase, CalendarClock, MapPin } from "lucide-react";
import { useStore } from "@/lib/store";
import { domainById, OPPORTUNITY_KINDS, PROFILES, RESOURCE_KINDS } from "@/lib/domains";
import type { Match } from "@/lib/matching";
import type { Opportunity, Resource, User } from "@/lib/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { Avatar, DomainBadge, profileHref, Verified } from "./ui";

/** Carte de base des colonnes de l'accueil. */
export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-papier p-5 shadow-doux", className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-[0.95rem]">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Carte d'identité de la colonne gauche : bandeau aux couleurs des domaines, avatar, nom et ville. */
export function ProfileCard({ me }: { me: User }) {
  const colors = me.domains.map((d) => domainById(d)?.color ?? me.color);
  const band = colors.length > 1 ? colors.join(", ") : `${colors[0] ?? me.color}, ${me.color}`;
  const subtitle = me.role === "mentor" ? [me.title, me.organization].filter(Boolean).join(" · ") : me.profile ? PROFILES[me.profile].label : "Mentoré·e";
  return (
    <section className="overflow-hidden rounded-2xl bg-papier shadow-doux">
      <div className="relative h-16" style={{ background: `linear-gradient(120deg, ${band})` }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_120%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_85%_-20%,rgba(255,255,255,0.25),transparent_40%)]" />
      </div>
      <Link href="/profil" className="block px-5 pb-5">
        <Avatar user={me} size="lg" className="-mt-8 ring-4 ring-papier" />
        <p className="mt-3 font-serif text-base leading-tight text-nuit">{me.name}</p>
        <p className="mt-1 line-clamp-2 text-sm text-nuit-500">{subtitle}</p>
        {me.city && (
          <p className="mt-2 flex items-center gap-1 text-xs text-nuit-500">
            <MapPin size={12} className="text-terracotta" /> {me.city}, Guinée
          </p>
        )}
      </Link>
    </section>
  );
}

/** Liste de chiffres cliquables (« Relations 0 », « Posts 3 »…). */
export function StatsList({ rows }: { rows: { label: string; value: React.ReactNode; href: string }[] }) {
  return (
    <section className="rounded-2xl bg-papier py-2 shadow-doux">
      {rows.map((r) => (
        <Link key={r.label} href={r.href} className="flex items-center justify-between gap-3 px-5 py-2 text-sm transition hover:bg-creme">
          <span className="font-medium text-encre">{r.label}</span>
          <span className="font-semibold tabular-nums text-ciel">{r.value}</span>
        </Link>
      ))}
    </section>
  );
}

/** Raccourcis de la colonne gauche. */
export function Shortcuts({ links }: { links: { href: string; label: string; icon: typeof MapPin; tone: string }[] }) {
  return (
    <Panel title="Raccourcis">
      <nav className="-mx-2 space-y-0.5">
        {links.map(({ href, label, icon: Icon, tone }) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-encre transition hover:bg-creme hover:text-nuit">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
              <Icon size={16} />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </Panel>
  );
}

/** Zone « Commencer… » en tête du fil, avec trois actions rapides. */
export function Composer({ me, prompt, href, actions }: { me: User; prompt: string; href: string; actions: { href: string; label: string; short?: string; icon: typeof MapPin; color: string }[] }) {
  return (
    <section className="rounded-2xl bg-papier shadow-doux">
      <div className="flex items-center gap-3 px-5 pt-5">
        <Avatar user={me} size="md" />
        <Link href={href} className="flex h-12 flex-1 items-center rounded-full border border-beige-dark px-5 text-[0.95rem] text-nuit-500 transition hover:bg-creme">
          {prompt}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 border-t border-beige-dark px-2 py-1.5">
        {actions.map(({ href: to, label, short, icon: Icon, color }) => (
          <Link key={to} href={to} className="flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium text-encre transition hover:bg-creme">
            <Icon size={19} className={color} />
            <span className={cn("truncate", short && "hidden sm:inline")}>{label}</span>
            {short && <span className="truncate sm:hidden">{short}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

type FeedEntry = { kind: "ressource"; item: Resource } | { kind: "opportunite"; item: Opportunity };

/** Fil d'actualité : ressources et opportunités publiées par les membres, de la plus récente à la plus ancienne. */
export function Feed({ me, limit = 6 }: { me: User; limit?: number }) {
  const { state } = useStore();
  const entries: FeedEntry[] = [
    ...state.resources.map((item) => ({ kind: "ressource" as const, item })),
    ...state.opportunities.filter((o) => new Date(o.deadline) > new Date()).map((item) => ({ kind: "opportunite" as const, item })),
  ]
    // Les publications dans les domaines du membre passent en premier, puis par date.
    .sort((a, b) => Number(me.domains.includes(b.item.domain)) - Number(me.domains.includes(a.item.domain)) || b.item.createdAt.localeCompare(a.item.createdAt))
    .slice(0, limit);

  return (
    <section aria-label="Fil d'actualité" className="space-y-4">
      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-beige-dark" />
        <span className="text-xs font-medium text-nuit-500">Fil d&apos;actualité</span>
        <span className="h-px flex-1 bg-beige-dark" />
      </div>
      {entries.map((e) => (
        <FeedCard key={e.kind + e.item.id} entry={e} me={me} />
      ))}
      <Link href="/ressources" className="flex items-center justify-center gap-1.5 rounded-2xl bg-papier py-3 text-sm font-medium text-nuit-500 shadow-doux transition hover:text-nuit">
        Voir toute la bibliothèque <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function FeedCard({ entry, me }: { entry: FeedEntry; me: User }) {
  const { state, toggleSaveResource, toggleInterest } = useStore();
  const { item } = entry;
  const author = state.users.find((u) => u.id === item.authorId);
  const d = domainById(item.domain);
  const isRes = entry.kind === "ressource";
  const saved = isRes ? (item as Resource).saves.includes(me.id) : (item as Opportunity).interested.includes(me.id);
  const verb = isRes ? `a partagé ${RESOURCE_KINDS[(item as Resource).kind] === "Guide" ? "un guide" : "une ressource"}` : "a publié une opportunité";

  return (
    <article className="overflow-hidden rounded-2xl bg-papier shadow-doux">
      <header className="flex items-center gap-3 px-5 pt-5">
        {author && (
          <Link href={profileHref(author, me.id)} className="shrink-0">
            <Avatar user={author} size="md" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-nuit-500">
            {author && (
              <Link href={profileHref(author, me.id)} className="inline-flex items-center gap-1 font-semibold text-nuit hover:underline">
                {author.name} <Verified user={author} size={13} />
              </Link>
            )}{" "}
            {verb}
          </p>
          <p className="truncate text-xs text-nuit-500">
            {author?.title ? `${author.title} · ` : ""}
            {timeAgo(item.createdAt)}
          </p>
        </div>
      </header>

      <Link href={isRes ? `/ressources/${item.id}` : `/opportunites#${item.id}`} className="mx-5 mt-4 block rounded-xl border-l-4 p-4 transition hover:brightness-[0.98]" style={{ borderLeftColor: d?.color, backgroundColor: (d?.color ?? "#1B2533") + "0d" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: d?.color }}>
          {isRes ? `${RESOURCE_KINDS[(item as Resource).kind]} · ${(item as Resource).minutes} min` : `${OPPORTUNITY_KINDS[(item as Opportunity).kind]} · ${(item as Opportunity).organization}`}
        </p>
        <p className="mt-1.5 font-serif text-base leading-snug text-nuit">{item.title}</p>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-encre">{isRes ? (item as Resource).summary : (item as Opportunity).description}</p>
      </Link>

      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-beige-dark px-3 py-1.5">
        <DomainBadge id={item.domain} className="ml-2" />
        <div className="flex items-center">
          {!isRes && (
            <span className="mr-2 hidden items-center gap-1 text-xs text-nuit-500 sm:inline-flex">
              <CalendarClock size={13} /> jusqu&apos;au {formatDate((item as Opportunity).deadline)}
            </span>
          )}
          <button
            onClick={() => (isRes ? toggleSaveResource(item.id) : toggleInterest(item.id))}
            aria-pressed={saved}
            className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-creme", saved ? "text-terracotta-dark" : "text-nuit-500")}
          >
            {isRes ? <Bookmark size={16} className={saved ? "fill-current" : ""} /> : <Briefcase size={16} />}
            {isRes ? (saved ? "Enregistrée" : "Enregistrer") : saved ? "Intéressé·e" : "Ça m'intéresse"}
          </button>
        </div>
      </footer>
    </article>
  );
}

/** Suggestions de mentors (colonne droite), avec le score de compatibilité. */
export function MentorSuggestions({ matches }: { matches: Match[] }) {
  return (
    <Panel
      title="Mentors suggérés"
      action={
        <Link href="/mentors/trouver" className="text-xs font-medium text-nuit-500 hover:text-nuit">
          Affiner
        </Link>
      }
    >
      {matches.length === 0 && <p className="py-4 text-center text-sm text-nuit-500">Aucune suggestion pour le moment.</p>}
      <ul className="space-y-4">
        {matches.map((m) => (
          <li key={m.mentor.id} className="flex gap-3">
            <Avatar user={m.mentor} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-semibold text-nuit">
                <span className="truncate">{m.mentor.name}</span> <Verified user={m.mentor} size={13} />
              </p>
              <p className="truncate text-xs text-nuit-500">{m.mentor.title}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-beige">
                  <span className="block h-full rounded-full bg-sauge-dark" style={{ width: `${m.score}%` }} />
                </span>
                <span className="text-[0.7rem] font-semibold tabular-nums text-sauge-dark">{m.score} %</span>
              </div>
              <Link href={`/mentors/${m.mentor.id}`} className="mt-2 inline-flex items-center rounded-full border border-nuit/25 px-3 py-1 text-xs font-medium text-nuit transition hover:border-nuit hover:bg-creme">
                Voir le profil
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/mentors" className="mt-4 flex items-center justify-between border-t border-beige-dark pt-3 text-sm font-medium text-nuit-500 hover:text-nuit">
        Voir tous les mentors <ArrowRight size={15} />
      </Link>
    </Panel>
  );
}
