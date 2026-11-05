"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Bookmark, CalendarClock, MapPin, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { DOMAINS, domainById, OPPORTUNITY_KINDS } from "@/lib/domains";
import type { DomainId, OpportunityKind } from "@/lib/types";
import { cn, daysLeft, formatDate, plural } from "@/lib/utils";
import { Avatar, btn, Chip, DomainBadge, EmptyState, field, Modal, PageHeader, profileHref } from "@/components/ui";

export default function OpportunitesPage() {
  return (
    <Suspense>
      <Opportunites />
    </Suspense>
  );
}

function Opportunites() {
  const { state, me, toggleInterest } = useStore();
  const params = useSearchParams();
  const [kind, setKind] = useState<OpportunityKind | null>(null);
  const [forMe, setForMe] = useState(me?.role === "mentore");
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("nouveau")) setOpen(true);
  }, [params]);

  const list = useMemo(
    () =>
      state.opportunities
        .filter((o) => !kind || o.kind === kind)
        .filter((o) => !forMe || !me || me.domains.includes(o.domain))
        .filter((o) => !mine || (me && o.interested.includes(me.id)))
        .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [state.opportunities, kind, forMe, mine, me],
  );

  return (
    <div className="animate-apparition">
      <PageHeader eyebrow="Stages, emplois, bourses, concours" title="Opportunités" intro="Partagées par les mentors et les partenaires du programme. Repérez-les, puis préparez votre candidature avec votre mentor.">
        <button onClick={() => setOpen(true)} className={btn.accent}>
          <Plus size={16} /> Partager une opportunité
        </button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {me?.role === "mentore" && (
          <Chip active={forMe} onClick={() => setForMe(!forMe)}>
            Dans mes domaines
          </Chip>
        )}
        <Chip active={mine} onClick={() => setMine(!mine)}>
          <Bookmark size={13} className="mr-1 inline" /> Ma sélection
        </Chip>
        <span className="mx-1 hidden w-px bg-beige-dark sm:block" />
        {(Object.keys(OPPORTUNITY_KINDS) as OpportunityKind[]).map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? null : k)}>
            {OPPORTUNITY_KINDS[k]}
          </Chip>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {list.map((o) => {
          const author = state.users.find((u) => u.id === o.authorId);
          const left = daysLeft(o.deadline);
          const interested = !!me && o.interested.includes(me.id);
          const expired = new Date(o.deadline) < new Date();
          return (
            <article id={o.id} key={o.id} className={cn("scroll-mt-24 rounded-2xl bg-papier p-5 shadow-doux target:ring-2 target:ring-terracotta sm:p-6", expired && "opacity-60")}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-white" style={{ backgroundColor: domainById(o.domain)?.color }}>
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider">{OPPORTUNITY_KINDS[o.kind].slice(0, 5)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <DomainBadge id={o.domain} />
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", left <= 7 && !expired ? "bg-terracotta-light text-terracotta-dark" : "bg-beige/70 text-nuit-500")}>
                      <CalendarClock size={12} /> {expired ? "Clôturée" : left === 0 ? "Aujourd'hui" : `J-${left} · ${formatDate(o.deadline)}`}
                    </span>
                  </div>
                  <h2 className="mt-2 font-serif text-lg leading-tight">{o.title}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-nuit-500">
                    <span className="font-medium text-encre">{o.organization}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} /> {o.city}
                    </span>
                  </p>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-encre">{o.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    {author && (
                      <Link href={profileHref(author, me?.id)} className="flex items-center gap-2 text-xs text-nuit-500 hover:text-nuit">
                        <Avatar user={author} size="xs" /> Partagé par {author.name}
                        {o.interested.length > 0 && ` · ${plural(o.interested.length, "intéressé·e", "intéressé·es")}`}
                      </Link>
                    )}
                    {!expired && (
                      <button onClick={() => toggleInterest(o.id)} className={interested ? btn.primary : btn.ghost} aria-pressed={interested}>
                        <Bookmark size={15} className={interested ? "fill-terracotta text-terracotta" : ""} /> {interested ? "Dans ma sélection" : "Ça m'intéresse"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {list.length === 0 && <EmptyState title="Aucune opportunité" text="Modifiez les filtres ou revenez bientôt : les mentors en publient chaque semaine." />}

      <Modal open={open} onClose={() => setOpen(false)} title="Partager une opportunité" wide>
        {open && <NewOpportunity onDone={() => setOpen(false)} />}
      </Modal>
    </div>
  );
}

function NewOpportunity({ onDone }: { onDone: () => void }) {
  const { me, createOpportunity } = useStore();
  const [f, setF] = useState({
    title: "",
    organization: "",
    kind: "stage" as OpportunityKind,
    domain: (me?.domains[0] ?? "insertion") as DomainId,
    city: me?.city ?? "Conakry",
    deadline: new Date(Date.now() + 21 * 86400_000).toISOString().slice(0, 10),
    description: "",
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createOpportunity({ ...f, title: f.title.trim(), organization: f.organization.trim(), description: f.description.trim(), deadline: new Date(f.deadline + "T23:59").toISOString() });
        onDone();
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Intitulé</span>
        <input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={field} placeholder="Ex. : Stage en communication digitale" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Organisation</span>
          <input required value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Lieu</span>
          <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className={field} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Type</span>
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as OpportunityKind })} className={field}>
            {(Object.keys(OPPORTUNITY_KINDS) as OpportunityKind[]).map((k) => (
              <option key={k} value={k}>
                {OPPORTUNITY_KINDS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Domaine</span>
          <select value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value as DomainId })} className={field}>
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.short}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Date limite</span>
          <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} className={field} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Description</span>
        <textarea required rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={field + " resize-none"} placeholder="Profil recherché, conditions, comment postuler…" />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={btn.ghost}>
          Annuler
        </button>
        <button type="submit" className={btn.accent}>
          Publier
        </button>
      </div>
    </form>
  );
}
