"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { mySessions, useStore } from "@/lib/store";
import type { Session, User } from "@/lib/types";

import { Avatar, btn, Chip, EmptyState, Modal, PageHeader } from "@/components/ui";
import { BookingModal, RateModal, SessionRow } from "@/components/mentoring";
import { WeekRibbon } from "@/components/week-ribbon";

type Tab = "a-venir" | "passees" | "annulees";

export default function Seances() {
  const { state, me } = useStore();
  const [tab, setTab] = useState<Tab>("a-venir");
  const [rateFor, setRateFor] = useState<Session | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [bookWith, setBookWith] = useState<User | null>(null);
  if (!me) return null;

  const all = mySessions(state, me.id);
  const upcoming = all.filter((s) => s.status === "planifiee").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = all.filter((s) => s.status === "terminee").sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const cancelled = all.filter((s) => s.status === "annulee" || s.status === "refusee").sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const requests = all.filter((s) => s.status === "demandee").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const isMentor = me.role === "mentor";
  const list = tab === "a-venir" ? upcoming : tab === "passees" ? past : cancelled;
  const hours = Math.round(past.reduce((n, s) => n + s.duration, 0) / 6) / 10;

  const partners = state.mentorships
    .filter((m) => m.status === "active" && (m.mentorId === me.id || m.menteeId === me.id))
    .map((m) => state.users.find((u) => u.id === (m.mentorId === me.id ? m.menteeId : m.mentorId))!)
    .filter(Boolean);

  return (
    <div className="animate-apparition">
      <PageHeader eyebrow={`${past.length} séances réalisées · ${hours} h d'accompagnement`} title="Mes séances" intro={isMentor ? "Programmez les séances de vos mentorés et validez leurs demandes. Rejoignez-les en visio ou par chat et gardez vos notes." : "Demandez une séance sur les créneaux de votre mentor : elle sera confirmée dès sa validation. Rejoignez-la en visio ou par chat et évaluez chaque échange."}>
        {partners.length > 0 && (
          <button onClick={() => setPickOpen(true)} className={btn.accent}>
            <CalendarPlus size={16} /> {isMentor ? "Programmer une séance" : "Demander une séance"}
          </button>
        )}
      </PageHeader>

      <WeekRibbon sessions={all} />

      {requests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-serif text-lg">{isMentor ? `Demandes à valider (${requests.length})` : `En attente de validation (${requests.length})`}</h2>
          <p className="mb-4 text-sm text-nuit-500">
            {isMentor ? "Vos mentorés ont choisi ces créneaux. Validez-les pour les ajouter à votre agenda, ou déclinez en proposant une alternative." : "Votre mentor a été prévenu·e. Vous recevrez une notification dès sa réponse."}
          </p>
          <div className="space-y-3">
            {requests.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      <div className="mb-5 flex gap-2">
        <Chip active={tab === "a-venir"} onClick={() => setTab("a-venir")}>
          À venir ({upcoming.length})
        </Chip>
        <Chip active={tab === "passees"} onClick={() => setTab("passees")}>
          Passées ({past.length})
        </Chip>
        {cancelled.length > 0 && (
          <Chip active={tab === "annulees"} onClick={() => setTab("annulees")}>
            Annulées ou déclinées ({cancelled.length})
          </Chip>
        )}
      </div>

      <div className="space-y-3">
        {list.map((s) => (
          <SessionRow key={s.id} session={s} onRate={setRateFor} />
        ))}
      </div>
      {list.length === 0 && (
        <EmptyState
          title={tab === "a-venir" ? "Aucune séance prévue" : "Rien ici pour le moment"}
          text={partners.length ? (isMentor ? "Programmez une séance avec l'un de vos mentorés." : "Demandez une séance sur l'un des créneaux de votre mentor.") : isMentor ? "Vos séances apparaîtront ici dès que vous accompagnerez un mentoré." : "Commencez par trouver un mentor : vous pourrez ensuite demander vos séances."}
          action={
            partners.length ? (
              <button onClick={() => setPickOpen(true)} className={btn.primary}>
                {isMentor ? "Programmer" : "Demander une séance"}
              </button>
            ) : (
              <Link href="/mentors/trouver" className={btn.primary}>
                Trouver un mentor
              </Link>
            )
          }
        />
      )}

      <Modal open={pickOpen} onClose={() => setPickOpen(false)} title={isMentor ? "Avec quel mentoré ?" : "Avec quel mentor ?"}>
        <div className="space-y-2">
          {partners.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPickOpen(false);
                setBookWith(p);
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-papier p-3 text-left transition hover:bg-white"
            >
              <Avatar user={p} size="lg" />
              <span>
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-sm text-nuit-500">{p.role === "mentor" ? p.title : p.city}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {bookWith && (
        <BookingModal mentor={isMentor ? me : bookWith} mentee={isMentor ? bookWith : me} open onClose={() => setBookWith(null)} />
      )}
      {rateFor && <RateModal session={rateFor} open onClose={() => setRateFor(null)} />}
    </div>
  );
}
