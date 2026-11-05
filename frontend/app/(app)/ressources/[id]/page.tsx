"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, Bookmark, Clock, MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { CAMPUS_FRANCE_NOTICE, domainById, RESOURCE_KINDS } from "@/lib/domains";
import { formatDate } from "@/lib/utils";
import { Avatar, btn, profileHref, Verified } from "@/components/ui";

export default function Ressource() {
  const { id } = useParams<{ id: string }>();
  const { state, me, toggleSaveResource } = useStore();
  const r = state.resources.find((x) => x.id === id);
  if (!r) return notFound();
  const d = domainById(r.domain)!;
  const author = state.users.find((u) => u.id === r.authorId);
  const saved = !!me && r.saves.includes(me.id);
  const related = state.resources.filter((x) => x.domain === r.domain && x.id !== r.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl animate-apparition">
      <Link href="/ressources" className={btn.quiet + " -ml-3 mb-4"}>
        <ArrowLeft size={15} /> Bibliothèque
      </Link>

      <article>
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: d.color }}>
          {RESOURCE_KINDS[r.kind]} · {d.label}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl">{r.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-encre">{r.summary}</p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-beige-dark/70 py-4">
          {author && (
            <Link href={profileHref(author, me?.id)} className="flex items-center gap-3">
              <Avatar user={author} size="md" />
              <span>
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {author.name} <Verified user={author} size={14} />
                </span>
                <span className="block text-xs text-nuit-500">
                  {author.title} · {formatDate(r.createdAt)}
                </span>
              </span>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-nuit-500">
              <Clock size={14} /> {r.minutes} min
            </span>
            <button onClick={() => toggleSaveResource(r.id)} className={btn.ghost + " py-2"} aria-pressed={saved}>
              <Bookmark size={16} className={saved ? "fill-terracotta text-terracotta" : ""} /> {saved ? "Enregistrée" : "Enregistrer"}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {r.body.map((section) => (
            <section key={section.heading}>
              <h2 className="font-serif text-lg">{section.heading}</h2>
              <Body text={section.text} color={d.color} />
            </section>
          ))}
        </div>

        {r.domain === "campus-france" && <p className="mt-8 rounded-2xl bg-beige/60 px-4 py-3 text-sm leading-relaxed text-encre">NB : {CAMPUS_FRANCE_NOTICE}</p>}

        {author && me?.id !== author.id && (
          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-nuit p-6 text-creme sm:flex-row sm:items-center">
            <Avatar user={author} size="lg" />
            <p className="flex-1 font-serif text-lg leading-snug">Une question sur cette ressource ? {author.name.split(" ")[0]} peut vous accompagner.</p>
            <Link href={author.role === "mentor" ? `/mentors/${author.id}` : `/messages?avec=${author.id}`} className={btn.accent}>
              <MessageCircle size={16} /> Voir son profil
            </Link>
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-serif text-lg">Dans le même domaine</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((x) => (
              <Link key={x.id} href={`/ressources/${x.id}`} className="rounded-2xl bg-papier p-4 shadow-doux transition hover:shadow-lg">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: d.color }}>
                  {RESOURCE_KINDS[x.kind]}
                </p>
                <p className="mt-1 font-serif leading-tight">{x.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Rend un texte simple : les lignes commençant par « - » deviennent une liste à puces. */
function Body({ text, color }: { text: string; color: string }) {
  const lines = text.split("\n").filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("- "));
  const paragraphs = lines.filter((l) => !l.startsWith("- "));
  return (
    <div className="mt-3 space-y-3 text-[1.02rem] leading-relaxed text-encre">
      {paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {bullets.length > 0 && (
        <ul className="space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              {b.slice(2)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
