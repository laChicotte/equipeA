"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Award, Info, Send, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { domainById, PROFILES } from "@/lib/domains";
import { inferDomains, recommendMentors, type Match } from "@/lib/matching";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { btn, Eyebrow, field } from "@/components/ui";
import { MentorCard, RequestModal } from "@/components/mentoring";

const EXAMPLES = [
  "Je veux créer mon entreprise de transformation de fruits mais je ne sais pas comment trouver un financement.",
  "Je dois préparer mon entretien Campus France pour un master en économie.",
  "Jeune diplômé, je n'arrive pas à décrocher d'entretien d'embauche avec mon CV.",
  "J'ai peur de prendre la parole en public pour présenter mon projet.",
];

export default function Trouver() {
  const { state, me, updateProfile } = useStore();
  const [need, setNeed] = useState(me?.need ?? "");
  const [profile, setProfile] = useState<Profile>(me?.profile ?? "etudiant");
  const [phase, setPhase] = useState<"saisie" | "analyse" | "resultats">(me?.need ? "analyse" : "saisie");
  const [requestFor, setRequestFor] = useState<Match | null>(null);

  useEffect(() => {
    if (phase !== "analyse") return;
    const t = setTimeout(() => setPhase("resultats"), 1100);
    return () => clearTimeout(t);
  }, [phase]);

  const inferred = useMemo(() => inferDomains(need).slice(0, 3), [need]);
  const matches = useMemo(() => {
    if (!me) return [];
    const existing = new Set(state.mentorships.filter((m) => m.menteeId === me.id && (m.status === "active" || m.status === "en-attente")).map((m) => m.mentorId));
    return recommendMentors(state, { ...me, profile, domains: inferred.length ? [] : me.domains }, { need })
      .filter((m) => m.score > 0)
      .map((m) => ({ ...m, already: existing.has(m.mentor.id) }));
  }, [state, me, need, profile, inferred.length]);

  if (!me) return null;

  const analyse = (e: React.FormEvent) => {
    e.preventDefault();
    if (need.trim().length < 10) return;
    updateProfile({ need: need.trim(), profile, domains: inferred.length ? inferred.map((x) => x.id) : me.domains });
    setPhase("analyse");
  };

  return (
    <div className="mx-auto max-w-4xl animate-apparition">
      <Link href="/mentors" className={btn.quiet + " -ml-3 mb-4"}>
        <ArrowLeft size={15} /> Tous les mentors
      </Link>

      <section className="rounded-2xl bg-nuit p-6 text-creme sm:p-10">
        <Eyebrow className="flex items-center gap-1.5 text-terracotta-light">
          <Sparkles size={13} /> Recommandation guidée
        </Eyebrow>
        <h1 className="mt-3 font-serif text-2xl leading-tight sm:text-[2.25rem]">De quoi avez-vous besoin ?</h1>
        <p className="mt-3 max-w-xl text-creme/70">Expliquez votre situation comme vous le feriez à un ami. Lirel identifie les domaines concernés et vous propose les mentors les plus adaptés, en expliquant pourquoi.</p>

        <form onSubmit={analyse} className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(PROFILES) as Profile[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setProfile(p)}
                aria-pressed={profile === p}
                className={cn("rounded-full border px-3 py-1.5 text-sm transition", profile === p ? "border-terracotta bg-terracotta text-white" : "border-creme/20 text-creme/80 hover:border-creme/50")}
              >
                {PROFILES[p].label}
              </button>
            ))}
          </div>
          <textarea
            value={need}
            onChange={(e) => {
              setNeed(e.target.value);
              if (phase === "resultats") setPhase("saisie");
            }}
            rows={4}
            className={field + " resize-none border-transparent bg-creme text-[1.02rem]"}
            placeholder="Ex. : Je suis en dernière année de licence et je veux poursuivre mes études en France…"
            aria-label="Votre besoin"
          />
          {!need && (
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button type="button" key={ex} onClick={() => setNeed(ex)} className="rounded-full bg-creme/10 px-3 py-1.5 text-left text-xs text-creme/80 hover:bg-creme/20">
                  {ex.slice(0, 48)}…
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {inferred.length > 0 && <span className="text-creme/60">Domaines détectés :</span>}
              {inferred.map((x) => (
                <span key={x.id} className="rounded-full bg-creme px-2.5 py-1 text-xs font-semibold" style={{ color: domainById(x.id)?.color }}>
                  {domainById(x.id)?.short}
                </span>
              ))}
            </div>
            <button type="submit" disabled={need.trim().length < 10 || phase === "analyse"} className={btn.accent + " px-6 py-3"}>
              <Sparkles size={17} /> {phase === "resultats" ? "Relancer l'analyse" : "Trouver mes mentors"}
            </button>
          </div>
        </form>
      </section>

      {phase === "analyse" && (
        <div className="mt-10 flex flex-col items-center gap-4 py-10 text-center" role="status">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-terracotta" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
          <p className="font-serif text-xl">Analyse de votre besoin…</p>
          <p className="text-sm text-nuit-500">Comparaison avec les compétences, les avis et les disponibilités de {state.users.filter((u) => u.role === "mentor").length} mentors</p>
        </div>
      )}

      {phase === "resultats" && (
        <section className="mt-10 animate-apparition">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Vos meilleures correspondances</Eyebrow>
              <h2 className="mt-1 font-serif text-3xl font-medium">{matches.length ? `${Math.min(3, matches.length)} mentors pour vous` : "Aucune correspondance"}</h2>
            </div>
            <Link href="/mentors" className={btn.link}>
              Voir tous les mentors
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {matches.slice(0, 3).map((m, i) => (
              <div key={m.mentor.id} className="flex flex-col">
                {i === 0 && <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-terracotta-dark">
                    <Award size={14} /> Meilleur choix
                  </p>}
                {i > 0 && <p className="mb-2 text-xs text-transparent">.</p>}
                <MentorCard mentor={m.mentor} match={m} compact />
                {m.already ? (
                  <Link href={`/messages?avec=${m.mentor.id}`} className={btn.ghost + " mt-3"}>
                    Déjà en relation · Écrire
                  </Link>
                ) : (
                  <button onClick={() => setRequestFor(m)} className={btn.primary + " mt-3"}>
                    <Send size={15} /> Demander un mentorat
                  </button>
                )}
              </div>
            ))}
          </div>

          {matches.length > 3 && (
            <details className="mt-8 rounded-2xl bg-papier p-5 shadow-doux">
              <summary className="cursor-pointer font-medium">Autres profils pertinents ({matches.length - 3})</summary>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {matches.slice(3, 9).map((m) => (
                  <MentorCard key={m.mentor.id} mentor={m.mentor} match={m} compact />
                ))}
              </div>
            </details>
          )}

          <p className="mt-8 flex items-start gap-2 rounded-2xl bg-beige/60 px-4 py-3 text-xs leading-relaxed text-encre">
            <Info size={15} className="mt-0.5 shrink-0" />
            Comment est calculée la compatibilité ? Lirel combine les domaines détectés dans votre texte, les compétences déclarées par les mentors, votre profil, la note
            moyenne des séances, les places disponibles et la proximité géographique. Chaque critère retenu est affiché sur la carte : la recommandation reste transparente et
            c&apos;est vous qui choisissez.
          </p>
        </section>
      )}

      {requestFor && <RequestModal mentor={requestFor.mentor} defaultDomain={requestFor.domain} open onClose={() => setRequestFor(null)} />}
    </div>
  );
}
