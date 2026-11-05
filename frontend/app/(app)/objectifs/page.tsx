"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Check, MessageSquareQuote, PartyPopper, Plus, Trash2 } from "lucide-react";
import { goalProgress, useStore } from "@/lib/store";
import { DOMAINS, domainById } from "@/lib/domains";
import type { DomainId, Goal } from "@/lib/types";
import { cn, daysLeft, formatDate } from "@/lib/utils";
import { Avatar, btn, DomainBadge, EmptyState, field, Modal, PageHeader, profileHref, Ring } from "@/components/ui";

export default function ObjectifsPage() {
  return (
    <Suspense>
      <Objectifs />
    </Suspense>
  );
}

function Objectifs() {
  const { state, me } = useStore();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (params.get("nouveau")) setOpen(true);
  }, [params]);
  if (!me) return null;

  if (me.role === "mentor") {
    const goals = state.goals.filter((g) => g.mentorId === me.id);
    return (
      <div className="animate-apparition">
        <PageHeader eyebrow="Suivi des parcours" title="Objectifs de mes mentorés" intro="Suivez la progression de chacun et laissez un conseil depuis sa fiche." />
        {goals.length === 0 && <EmptyState title="Aucun objectif suivi" text="Quand vos mentorés vous associent à un objectif, il apparaît ici." />}
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const owner = state.users.find((u) => u.id === g.userId)!;
            return (
              <div key={g.id}>
                <Link href={profileHref(owner)} className="mb-2 flex items-center gap-2 text-sm font-medium hover:text-terracotta-dark">
                  <Avatar user={owner} size="xs" /> {owner.name}
                </Link>
                <GoalCard goal={g} readOnly />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const goals = state.goals.filter((g) => g.userId === me.id);
  const done = goals.reduce((n, g) => n + goalProgress(g).done, 0);
  const total = goals.reduce((n, g) => n + goalProgress(g).total, 0);

  return (
    <div className="animate-apparition">
      <PageHeader eyebrow="Mon parcours" title="Mes objectifs" intro="Un objectif clair, découpé en petites étapes, partagé avec votre mentor : c'est ainsi que les projets avancent.">
        <div className="flex items-center gap-4">
          <Ring value={done} max={total || 1} size={84} stroke={8}>
            <span className="font-serif text-lg font-semibold">{total ? Math.round((done / total) * 100) : 0}%</span>
          </Ring>
          <button onClick={() => setOpen(true)} className={btn.accent}>
            <Plus size={16} /> Nouvel objectif
          </button>
        </div>
      </PageHeader>

      {goals.length === 0 ? (
        <EmptyState title="Fixez votre premier objectif" text="Par exemple : « Décrocher un stage », « Déposer mon dossier Campus France » ou « Trouver mes 10 premiers clients »." action={<button onClick={() => setOpen(true)} className={btn.primary}>Créer un objectif</button>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvel objectif" wide>
        {open && <NewGoal onDone={() => setOpen(false)} />}
      </Modal>
    </div>
  );
}

function GoalCard({ goal, readOnly }: { goal: Goal; readOnly?: boolean }) {
  const { state, toggleStep, addStep, deleteGoal } = useStore();
  const [step, setStep] = useState("");
  const p = goalProgress(goal);
  const d = domainById(goal.domain);
  const mentor = state.users.find((u) => u.id === goal.mentorId);
  const left = daysLeft(goal.dueAt);

  return (
    <article id={goal.id} className="scroll-mt-24 rounded-2xl bg-papier p-5 shadow-doux sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <DomainBadge id={goal.domain} />
          <h2 className="mt-2 font-serif text-lg leading-tight">{goal.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-nuit-500">
            Échéance : {formatDate(goal.dueAt)} ·{" "}
            {p.pct === 100 ? (
              <span className="inline-flex items-center gap-1 font-medium text-sauge-dark">
                <PartyPopper size={13} /> atteint
              </span>
            ) : (
              `${left} jours restants`
            )}
          </p>
        </div>
        <Ring value={p.done} max={p.total || 1} size={64} stroke={6}>
          <span className="text-sm font-semibold">{p.pct}%</span>
        </Ring>
      </div>

      <ul className="mt-5 space-y-1">
        {goal.steps.map((s) => (
          <li key={s.id}>
            <button
              disabled={readOnly}
              onClick={() => toggleStep(goal.id, s.id)}
              className={cn("flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left text-[0.95rem] transition", !readOnly && "hover:bg-beige/50", s.done && "text-nuit-500")}
              aria-pressed={s.done}
            >
              <span
                className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition", s.done ? "border-transparent text-white" : "border-beige-dark")}
                style={s.done ? { backgroundColor: d?.color } : undefined}
              >
                {s.done && <Check size={12} strokeWidth={3} />}
              </span>
              <span className={cn(s.done && "line-through")}>{s.text}</span>
            </button>
          </li>
        ))}
      </ul>

      {!readOnly && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step.trim()) addStep(goal.id, step.trim());
            setStep("");
          }}
          className="mt-2 flex gap-2 px-2"
        >
          <input value={step} onChange={(e) => setStep(e.target.value)} className="flex-1 border-b border-dashed border-beige-dark bg-transparent py-1.5 text-sm outline-none focus:border-terracotta" placeholder="+ Ajouter une étape" aria-label="Nouvelle étape" />
        </form>
      )}

      {goal.mentorNote && mentor && (
        <div className="mt-5 flex gap-3 rounded-2xl bg-sauge-light/60 p-4">
          <MessageSquareQuote size={18} className="mt-0.5 shrink-0 text-sauge-dark" />
          <div>
            <p className="text-sm leading-relaxed text-nuit">{goal.mentorNote}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-sauge-dark">
              <Avatar user={mentor} size="xs" /> {mentor.name}
            </p>
          </div>
        </div>
      )}
      {!goal.mentorNote && mentor && <p className="mt-5 flex items-center gap-1.5 text-xs text-nuit-500"><Avatar user={mentor} size="xs" /> Suivi par {mentor.name}</p>}

      {!readOnly && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              if (confirm(`Supprimer l'objectif « ${goal.title} » ?`)) deleteGoal(goal.id);
            }}
            className={btn.quiet + " text-xs"}
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      )}
    </article>
  );
}

function NewGoal({ onDone }: { onDone: () => void }) {
  const { state, me, addGoal } = useStore();
  const mentors = state.mentorships.filter((m) => m.menteeId === me?.id && m.status === "active").map((m) => state.users.find((u) => u.id === m.mentorId)!);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<DomainId>(me?.domains[0] ?? "insertion");
  const [mentorId, setMentorId] = useState<string>(mentors[0]?.id ?? "");
  const [due, setDue] = useState(new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10));
  const [steps, setSteps] = useState(["", "", ""]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addGoal({ title: title.trim(), domain, dueAt: new Date(due).toISOString(), mentorId: mentorId || undefined, steps });
        onDone();
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Mon objectif</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Ex. : Décrocher un stage en marketing digital" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Domaine</span>
          <select value={domain} onChange={(e) => setDomain(e.target.value as DomainId)} className={field}>
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.short}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Échéance</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Partager avec</span>
          <select value={mentorId} onChange={(e) => setMentorId(e.target.value)} className={field}>
            <option value="">Personne</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Les étapes</legend>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <input key={i} value={s} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))} className={field + " py-2"} placeholder={`Étape ${i + 1}`} aria-label={`Étape ${i + 1}`} />
          ))}
        </div>
        <button type="button" onClick={() => setSteps([...steps, ""])} className={btn.link + " mt-2"}>
          <Plus size={14} /> Ajouter une étape
        </button>
      </fieldset>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className={btn.ghost}>
          Annuler
        </button>
        <button type="submit" className={btn.accent}>
          Créer l&apos;objectif
        </button>
      </div>
    </form>
  );
}
