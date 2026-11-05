"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bookmark, Clock, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { DOMAINS, domainById, RESOURCE_KINDS } from "@/lib/domains";
import type { DomainId, ResourceKind } from "@/lib/types";
import { Avatar, btn, Chip, EmptyState, PageHeader } from "@/components/ui";

export default function Ressources() {
  const { state, me, toggleSaveResource } = useStore();
  const [domain, setDomain] = useState<DomainId | null>(null);
  const [kind, setKind] = useState<ResourceKind | null>(null);
  const [saved, setSaved] = useState(false);

  const list = useMemo(
    () =>
      state.resources
        .filter((r) => !domain || r.domain === domain)
        .filter((r) => !kind || r.kind === kind)
        .filter((r) => !saved || (me && r.saves.includes(me.id))),
    [state.resources, domain, kind, saved, me],
  );

  return (
    <div className="animate-apparition">
      <PageHeader eyebrow={`${state.resources.length} ressources partagées par les mentors`} title="Bibliothèque" intro="Guides, modèles, check-lists, vidéos et livres conseillés : l'expérience des mentors, accessible à tout moment.">
        {me?.role === "mentor" && (
          <Link href="/ressources/nouvelle" className={btn.accent}>
            <Plus size={16} /> Partager une ressource
          </Link>
        )}
      </PageHeader>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!domain} onClick={() => setDomain(null)}>
          Tous les domaines
        </Chip>
        {DOMAINS.map((d) => (
          <Chip key={d.id} active={domain === d.id} onClick={() => setDomain(domain === d.id ? null : d.id)}>
            {d.short}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(RESOURCE_KINDS) as ResourceKind[]).map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? null : k)} className="py-1 text-xs">
            {RESOURCE_KINDS[k]}
          </Chip>
        ))}
        <Chip active={saved} onClick={() => setSaved(!saved)} className="py-1 text-xs">
          <Bookmark size={12} className="mr-1 inline" /> Enregistrées
        </Chip>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => {
          const d = domainById(r.domain)!;
          const author = state.users.find((u) => u.id === r.authorId);
          const isSaved = !!me && r.saves.includes(me.id);
          return (
            <article key={r.id} className="group relative flex flex-col overflow-hidden rounded-2xl bg-papier shadow-doux transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="h-2" style={{ backgroundColor: d.color }} />
              <button
                onClick={() => toggleSaveResource(r.id)}
                className="absolute right-3 top-5 z-10 rounded-full p-2 text-nuit-500 hover:bg-beige/70"
                aria-label={isSaved ? "Retirer des ressources enregistrées" : "Enregistrer la ressource"}
                aria-pressed={isSaved}
              >
                <Bookmark size={18} className={isSaved ? "fill-terracotta text-terracotta" : ""} />
              </button>
              <Link href={`/ressources/${r.id}`} className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: d.color }}>
                  {RESOURCE_KINDS[r.kind]} · {d.short}
                </p>
                <h2 className="mt-2 pr-8 font-serif text-lg leading-tight group-hover:text-terracotta-dark">{r.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-encre">{r.summary}</p>
                <div className="mt-auto flex items-center justify-between pt-5 text-xs text-nuit-500">
                  <span className="flex items-center gap-1.5">
                    <Avatar user={author} size="xs" /> {author?.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {r.minutes} min
                  </span>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
      {list.length === 0 && <EmptyState title="Aucune ressource" text={saved ? "Enregistrez des ressources pour les retrouver ici." : "Aucune ressource ne correspond à ces filtres."} />}
    </div>
  );
}
