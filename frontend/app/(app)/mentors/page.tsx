"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Heart, Search, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { DOMAINS, FORMATS } from "@/lib/domains";
import { activeMentees, mentorRating, recommendMentors } from "@/lib/matching";
import type { DomainId, Format } from "@/lib/types";
import { normalize } from "@/lib/utils";
import { btn, Chip, EmptyState, field, PageHeader } from "@/components/ui";
import { MentorCard } from "@/components/mentoring";

type Sort = "pertinence" | "note" | "experience";

export default function MentorsPage() {
  return (
    <Suspense>
      <Mentors />
    </Suspense>
  );
}

function Mentors() {
  const { state, me } = useStore();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [domain, setDomain] = useState<DomainId | null>((params.get("domaine") as DomainId) ?? null);
  const [format, setFormat] = useState<Format | null>(null);
  const [onlyFree, setOnlyFree] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState<Sort>(me?.role === "mentore" ? "pertinence" : "note");

  const matches = useMemo(() => (me ? recommendMentors(state, me) : []), [state, me]);

  const list = useMemo(() => {
    const n = normalize(q.trim());
    const favs = me ? (state.favorites[me.id] ?? []) : [];
    return matches
      .filter(({ mentor: m }) => !n || normalize([m.name, m.title, m.organization, m.city, m.bio, ...(m.skills ?? [])].join(" ")).includes(n))
      .filter(({ mentor: m }) => !domain || m.domains.includes(domain))
      .filter(({ mentor: m }) => !format || m.formats?.includes(format))
      .filter(({ mentor: m }) => !onlyFree || (m.capacity ?? 3) - activeMentees(state, m.id) > 0)
      .filter(({ mentor: m }) => !onlyFav || favs.includes(m.id))
      .sort((a, b) => {
        if (sort === "note") return mentorRating(state, b.mentor.id).avg - mentorRating(state, a.mentor.id).avg;
        if (sort === "experience") return (b.mentor.years ?? 0) - (a.mentor.years ?? 0);
        return b.score - a.score;
      });
  }, [matches, q, domain, format, onlyFree, onlyFav, sort, state, me]);

  const mentee = me?.role === "mentore";

  return (
    <div className="animate-apparition">
      <PageHeader
        eyebrow={`${matches.length} mentors · 7 domaines`}
        title="Les mentors"
        intro="Entrepreneurs, cadres, experts et anciens étudiants : des professionnels prêts à partager leur expérience."
      >
        {mentee && (
          <Link href="/mentors/trouver" className={btn.accent}>
            <Sparkles size={16} /> Recommandation guidée
          </Link>
        )}
      </PageHeader>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-nuit-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} className={field + " h-12 rounded-full pl-11"} placeholder="Nom, compétence, entreprise… (ex. « levée de fonds »)" aria-label="Rechercher un mentor" />
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!domain} onClick={() => setDomain(null)}>
          Tous les domaines
        </Chip>
        {DOMAINS.map((d) => (
          <Chip key={d.id} active={domain === d.id} onClick={() => setDomain(domain === d.id ? null : d.id)}>
            {d.short}
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {(Object.keys(FORMATS) as Format[]).map((f) => (
          <Chip key={f} active={format === f} onClick={() => setFormat(format === f ? null : f)} className="py-1 text-xs">
            {FORMATS[f]}
          </Chip>
        ))}
        <Chip active={onlyFree} onClick={() => setOnlyFree(!onlyFree)} className="py-1 text-xs">
          Places disponibles
        </Chip>
        {mentee && (
          <Chip active={onlyFav} onClick={() => setOnlyFav(!onlyFav)} className="inline-flex items-center gap-1.5 py-1 text-xs">
            <Heart size={13} className={onlyFav ? "fill-current" : ""} /> Favoris
          </Chip>
        )}
        <label className="ml-auto flex items-center gap-2 text-nuit-500">
          Trier par
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-beige-dark bg-papier px-3 py-1.5 text-sm text-nuit">
            {mentee && <option value="pertinence">Pertinence pour moi</option>}
            <option value="note">Note</option>
            <option value="experience">Expérience</option>
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <MentorCard key={m.mentor.id} mentor={m.mentor} match={mentee && sort === "pertinence" ? m : undefined} />
        ))}
      </div>
      {list.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Aucun mentor ne correspond"
            text="Élargissez vos filtres, ou décrivez votre besoin pour obtenir une recommandation guidée."
            action={
              <button
                onClick={() => {
                  setQ("");
                  setDomain(null);
                  setFormat(null);
                  setOnlyFree(false);
                  setOnlyFav(false);
                }}
                className={btn.ghost}
              >
                Réinitialiser les filtres
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
