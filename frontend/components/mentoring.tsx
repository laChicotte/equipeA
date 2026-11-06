"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Heart, MapPin, MessageCircle, MessageSquare, NotebookPen, Star, Users, Video, X } from "lucide-react";
import { AXES, CAMPUS_FRANCE_NOTICE, DAYS, domainById, FORMATS } from "@/lib/domains";
import { activeMentees, mentorRating, nextSlots, type Match } from "@/lib/matching";
import { useStore } from "@/lib/store";
import type { AxisId, DomainId, Format, Mentorship, Session, User } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { Avatar, btn, DomainBadge, field, Modal, StarInput, Verified } from "./ui";

export const FORMAT_ICONS: Record<Format, typeof Video> = { visio: Video, chat: MessageSquare, presentiel: MapPin };

export function RatingLine({ mentor, className }: { mentor: User; className?: string }) {
  const { state } = useStore();
  const r = mentorRating(state, mentor.id);
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star size={14} className={r.count ? "fill-terracotta text-terracotta" : "text-beige-dark"} />
      {r.count ? (
        <>
          <span className="font-semibold">{r.avg.toFixed(1)}</span>
          <span className="text-nuit-500">
            ({r.count} avis · {r.sessions} séances)
          </span>
        </>
      ) : (
        <span className="text-nuit-500">Nouveau mentor</span>
      )}
    </span>
  );
}

/** Carte d'un mentor, avec en option le score de compatibilité et ses raisons. */
export function MentorCard({ mentor, match, compact }: { mentor: User; match?: Match; compact?: boolean }) {
  const { state, me, toggleFavorite } = useStore();
  const fav = me ? (state.favorites[me.id] ?? []).includes(mentor.id) : false;
  const free = (mentor.capacity ?? 3) - activeMentees(state, mentor.id);
  return (
    <article className="group relative flex flex-col rounded-2xl bg-papier p-6 shadow-doux transition hover:shadow-lg">
      {me?.role === "mentore" && (
        <button
          onClick={() => toggleFavorite(mentor.id)}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-nuit-500 transition hover:bg-beige"
          aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={fav}
        >
          <Heart size={18} className={fav ? "fill-terracotta text-terracotta" : ""} />
        </button>
      )}
      <Link href={`/mentors/${mentor.id}`} className="flex items-start gap-4 pr-8">
        <Avatar user={mentor} size="lg" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-serif text-base leading-tight text-nuit">
            {mentor.name} <Verified user={mentor} />
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-nuit-500">
            {mentor.title} · {mentor.organization}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-nuit-500">
            <MapPin size={12} /> {mentor.city} · {mentor.years} ans d&apos;expérience
          </p>
        </div>
      </Link>

      {match && match.score > 0 && (
        <div className="mt-5 border-t border-beige-dark pt-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-nuit-500">Compatibilité</span>
            <span className="font-semibold tabular-nums text-nuit">{match.score} %</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-beige">
            <div className="h-full rounded-full bg-sauge-dark" style={{ width: `${match.score}%` }} />
          </div>
          {match.reasons.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs leading-relaxed text-encre">
              {match.reasons.slice(0, 3).map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-nuit-500" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!compact && (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {mentor.domains.map((d) => (
              <DomainBadge key={d} id={d} />
            ))}
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-nuit-500">{(mentor.skills ?? []).join(" · ")}</p>
        </>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
        <RatingLine mentor={mentor} />
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", free > 0 ? "text-sauge-dark" : "text-nuit-500")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", free > 0 ? "bg-sauge-dark" : "bg-nuit-500/50")} />
          {free > 0 ? `${free} place${free > 1 ? "s" : ""} disponible${free > 1 ? "s" : ""}` : "Complet"}
        </span>
      </div>
    </article>
  );
}

/** Demande de mentorat : domaine, axe du programme et message de présentation. */
export function RequestModal({ mentor, open, onClose, defaultDomain }: { mentor: User; open: boolean; onClose: () => void; defaultDomain?: DomainId }) {
  const { me, requestMentorship } = useStore();
  const [domain, setDomain] = useState<DomainId>(defaultDomain ?? mentor.domains.find((d) => me?.domains.includes(d)) ?? mentor.domains[0]);
  const [axis, setAxis] = useState<AxisId>(domain === "entrepreneuriat" ? "entrepreneuriat" : "orientation");
  const [message, setMessage] = useState(
    me?.need ? `Bonjour ${mentor.name.split(" ")[0]}, ${me.need.charAt(0).toLowerCase()}${me.need.slice(1)} Votre parcours correspond à ce que je recherche.` : "",
  );
  return (
    <Modal open={open} onClose={onClose} title={`Demander un mentorat à ${mentor.name.split(" ")[0]}`} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          requestMentorship(mentor.id, { domain, axis, message: message.trim() });
          onClose();
        }}
        className="space-y-5"
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Dans quel domaine ?</legend>
          <div className="flex flex-wrap gap-2">
            {mentor.domains.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDomain(d)}
                aria-pressed={domain === d}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", domain === d ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
              >
                {domainById(d)?.short}
              </button>
            ))}
          </div>
          {domain === "campus-france" && <p className="mt-3 rounded-xl bg-beige/60 px-3 py-2 text-xs leading-relaxed text-encre">{CAMPUS_FRANCE_NOTICE}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Ce que vous attendez de cet accompagnement</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(AXES) as AxisId[]).map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAxis(a)}
                aria-pressed={axis === a}
                className={cn("rounded-2xl border p-3 text-left transition", axis === a ? "border-terracotta bg-terracotta-light/40" : "border-beige-dark bg-papier hover:border-nuit/30")}
              >
                <span className="block text-sm font-semibold">{AXES[a].label}</span>
                <span className="mt-0.5 block text-xs text-nuit-500">{AXES[a].text}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Votre message</span>
          <textarea
            required
            minLength={20}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={field + " resize-none"}
            placeholder="Présentez-vous en quelques lignes : votre parcours, votre objectif, et pourquoi ce mentor."
          />
          <span className="mt-1 block text-xs text-nuit-500">Un message précis augmente fortement vos chances d&apos;être accepté·e.</span>
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn.ghost}>
            Annuler
          </button>
          <button type="submit" className={btn.accent}>
            Envoyer ma demande
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Mois proposés dans le calendrier de réservation (mois courant + 3). */
const CALENDAR_MONTHS = 4;
const WEEKDAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];
const isoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

/**
 * Calendrier du mentoré : seuls les jours où le mentor est disponible sont cliquables,
 * puis seules ses heures de disponibilité (encore libres) sont proposées pour ce jour.
 */
function AvailabilityCalendar({ mentor, value, onChange }: { mentor: User; value: string | null; onChange: (iso: string | null) => void }) {
  const { state } = useStore();
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const [day, setDay] = useState<Date | null>(value ? new Date(new Date(value).setHours(0, 0, 0, 0)) : null);

  const taken = new Set(
    state.sessions.filter((s) => s.mentorId === mentor.id && (s.status === "planifiee" || s.status === "demandee")).map((s) => new Date(s.startsAt).getTime()),
  );
  /** Heures encore libres un jour donné, d'après les créneaux hebdomadaires du mentor. */
  const freeHours = (d: Date) =>
    (mentor.slots ?? [])
      .filter((s) => s.day === isoDay(d))
      .map((s) => new Date(new Date(d).setHours(s.hour, 0, 0, 0)))
      .filter((t) => t.getTime() > Date.now() + 2 * 3600_000 && !taken.has(t.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const lead = isoDay(month) - 1; // cases vides avant le 1er (semaine commençant le lundi)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const availableDays = [...new Set((mentor.slots ?? []).map((s) => s.day))].sort().map((d) => DAYS[d].toLowerCase());
  const hours = day ? freeHours(day) : [];

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,17rem)_1fr]">
      <div className="rounded-2xl border border-beige-dark bg-papier p-3">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => setOffset(offset - 1)} disabled={offset === 0} className="rounded-full p-1.5 hover:bg-beige disabled:opacity-30" aria-label="Mois précédent">
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-semibold capitalize">{formatDate(month.toISOString(), { month: "long", year: "numeric" })}</p>
          <button type="button" onClick={() => setOffset(offset + 1)} disabled={offset >= CALENDAR_MONTHS - 1} className="rounded-full p-1.5 hover:bg-beige disabled:opacity-30" aria-label="Mois suivant">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS_SHORT.map((w, i) => (
            <span key={i} className="py-1 text-[0.65rem] font-semibold text-nuit-500">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`vide-${i}`} />;
            const free = freeHours(d).length > 0;
            const selected = day?.getTime() === d.getTime();
            return (
              <button
                type="button"
                key={d.getTime()}
                disabled={!free}
                onClick={() => {
                  setDay(d);
                  const first = freeHours(d)[0];
                  onChange(first ? first.toISOString() : null);
                }}
                aria-pressed={selected}
                aria-label={`${formatDate(d.toISOString(), { weekday: "long", day: "numeric", month: "long" })}${free ? "" : " (indisponible)"}`}
                className={cn(
                  "aspect-square rounded-full text-sm transition",
                  selected ? "bg-nuit font-semibold text-creme" : free ? "bg-sauge-light font-medium text-sauge-dark hover:bg-sauge hover:text-white" : "text-nuit-500/40",
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {day ? (
          <>
            <p className="mb-2 text-sm font-semibold capitalize">{formatDate(day.toISOString(), { weekday: "long", day: "numeric", month: "long" })}</p>
            <div className="flex flex-wrap gap-2">
              {hours.map((t) => {
                const iso = t.toISOString();
                return (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => onChange(iso)}
                    aria-pressed={value === iso}
                    className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition", value === iso ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
                  >
                    {formatDate(iso, { hour: "2-digit", minute: "2-digit" })}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-nuit-500">Choisissez un jour en vert dans le calendrier.</p>
        )}
        <p className="mt-4 text-xs text-nuit-500">
          {mentor.name.split(" ")[0]} est disponible le {availableDays.join(", ").replace(/, ([^,]*)$/, " et $1")}. Les autres jours ne peuvent pas être demandés ; pour un horaire exceptionnel, écrivez-lui : elle ou il pourra programmer la séance.
        </p>
      </div>
    </div>
  );
}

/** Valeur d'un champ datetime-local (heure locale) pour une date donnée. */
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/**
 * Séance entre un mentor et son mentoré :
 * - ouverte par le mentor, elle est PROGRAMMÉE (créneau libre ou date au choix) et confirmée d'emblée ;
 * - ouverte par le mentoré, c'est une DEMANDE sur l'un des créneaux du mentor, qu'il devra valider.
 */
export function BookingModal({ mentor, mentee, open, onClose }: { mentor: User; mentee: User; open: boolean; onClose: () => void }) {
  const { state, me, bookSession } = useStore();
  const router = useRouter();
  const byMentor = me?.id === mentor.id;
  const slots = nextSlots(state, mentor, 9);
  const formats = mentor.formats ?? ["visio"];
  const [slot, setSlot] = useState<string | null>(slots[0]?.toISOString() ?? null);
  const [custom, setCustom] = useState(false);
  const [customAt, setCustomAt] = useState(() => {
    const d = new Date(Date.now() + 86400_000);
    d.setHours(18, 0, 0, 0);
    return toLocalInput(d);
  });
  const [format, setFormat] = useState<Format>(formats[0]);
  const [duration, setDuration] = useState(45);
  const [topic, setTopic] = useState("");

  // Mentoré : date choisie dans le calendrier, forcément sur les disponibilités du mentor.
  const [pickedAt, setPickedAt] = useState<string | null>(null);

  const startsAt = custom ? (byMentor ? (customAt ? new Date(customAt).toISOString() : null) : pickedAt) : slot;
  const inPast = !!startsAt && new Date(startsAt).getTime() < Date.now();
  const otherFirst = (byMentor ? mentee : mentor).name.split(" ")[0];
  const ofOther = /^[aeiouyhâàéèêîïôû]/i.test(otherFirst) ? `d'${otherFirst}` : `de ${otherFirst}`;
  const hasSlots = !!mentor.slots?.length;

  return (
    <Modal open={open} onClose={onClose} title={byMentor ? `Programmer une séance avec ${otherFirst}` : `Demander une séance à ${otherFirst}`} wide>
      {!byMentor && (
        <p className="-mt-2 mb-5 rounded-2xl bg-sauge-light/60 px-4 py-3 text-sm text-sauge-dark">
          Choisissez un créneau parmi les disponibilités {ofOther}. Votre demande lui sera envoyée : la séance apparaîtra comme confirmée dès sa validation.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!startsAt || inPast) return;
          const id = await bookSession({ mentorId: mentor.id, menteeId: mentee.id, startsAt, format, duration, topic: topic.trim() || "Point d'étape" });
          if (!id) return;
          onClose();
          router.push("/seances");
        }}
        className="space-y-5"
      >
        <fieldset>
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
            <CalendarDays size={16} className="text-terracotta" /> {byMentor ? "Quand ?" : `Disponibilités ${ofOther}`}
          </legend>
          {(byMentor || hasSlots) && (
            <div className="mb-3 flex gap-2">
              <button type="button" onClick={() => setCustom(false)} aria-pressed={!custom} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", !custom ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}>
                {byMentor ? "Mes créneaux" : "Prochains créneaux"}
              </button>
              <button type="button" onClick={() => setCustom(true)} aria-pressed={custom} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", custom ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}>
                Autre date
              </button>
            </div>
          )}
          {byMentor && custom ? (
            <label className="block">
              <input type="datetime-local" value={customAt} min={toLocalInput(new Date())} step={900} onChange={(e) => setCustomAt(e.target.value)} className={field + " max-w-xs"} aria-label="Date et heure de la séance" />
              {inPast && <span className="mt-1.5 block text-sm text-terracotta-dark">Cette date est déjà passée.</span>}
            </label>
          ) : custom ? (
            <AvailabilityCalendar mentor={mentor} value={pickedAt} onChange={setPickedAt} />
          ) : slots.length === 0 ? (
            <p className="text-sm text-nuit-500">
              {byMentor ? "Aucun créneau libre dans vos disponibilités : choisissez « Autre date »." : `Aucun créneau libre dans les deux prochaines semaines. Écrivez à ${otherFirst} pour convenir d'un horaire : elle ou il pourra programmer la séance.`}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((d) => {
                const iso = d.toISOString();
                return (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => setSlot(iso)}
                    aria-pressed={slot === iso}
                    className={cn("rounded-2xl border px-3 py-2.5 text-left transition", slot === iso ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
                  >
                    <span className="block text-sm font-semibold capitalize">{formatDate(iso, { weekday: "long", day: "numeric", month: "short" })}</span>
                    <span className={cn("text-xs", slot === iso ? "text-creme/70" : "text-nuit-500")}>{formatDate(iso, { hour: "2-digit", minute: "2-digit" })}</span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Format</legend>
            <div className="flex flex-wrap gap-2">
              {formats.map((f) => {
                const Icon = FORMAT_ICONS[f];
                return (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFormat(f)}
                    aria-pressed={format === f}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", format === f ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
                  >
                    <Icon size={15} /> {FORMATS[f]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Durée</legend>
            <div className="flex gap-2">
              {[30, 45, 60].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setDuration(m)}
                  aria-pressed={duration === m}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", duration === m ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
                >
                  {m} min
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Sujet de la séance</span>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className={field} placeholder="Ex. : relire mon CV, préparer mon pitch…" />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn.ghost}>
            Annuler
          </button>
          <button type="submit" disabled={!startsAt || inPast} className={btn.accent}>
            {byMentor ? "Programmer la séance" : "Envoyer la demande"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function RateModal({ session, open, onClose }: { session: Session; open: boolean; onClose: () => void }) {
  const { rateSession, state } = useStore();
  const mentor = state.users.find((u) => u.id === session.mentorId);
  const [rating, setRating] = useState(session.rating ?? 0);
  const [review, setReview] = useState(session.review ?? "");
  return (
    <Modal open={open} onClose={onClose} title="Évaluer la séance">
      <p className="-mt-2 mb-5 text-sm text-encre">
        « {session.topic} » avec {mentor?.name}. Votre avis aide les autres membres à choisir leur mentor et aide le mentor à progresser.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!rating) return;
          rateSession(session.id, rating, review);
          onClose();
        }}
        className="space-y-5"
      >
        <StarInput value={rating} onChange={setRating} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Ce que vous avez retenu (facultatif)</span>
          <textarea rows={3} value={review} onChange={(e) => setReview(e.target.value)} className={field + " resize-none"} placeholder="Un conseil marquant, ce qui vous a aidé…" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn.ghost}>
            Plus tard
          </button>
          <button type="submit" disabled={!rating} className={btn.accent}>
            Envoyer l&apos;évaluation
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Ligne d'agenda d'une séance, avec les actions adaptées à son état. */
export function SessionRow({ session, onRate }: { session: Session; onRate?: (s: Session) => void }) {
  const { state, me, cancelSession, respondSession } = useStore();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  if (!me) return null;
  const requested = session.status === "demandee";
  const iAmMentor = session.mentorId === me.id;
  const otherId = session.mentorId === me.id ? session.menteeId : session.mentorId;
  const other = state.users.find((u) => u.id === otherId);
  const Icon = FORMAT_ICONS[session.format];
  const start = new Date(session.startsAt);
  const soon = session.status === "planifiee" && start.getTime() - Date.now() < 3 * 86400_000;
  const past = session.status === "terminee";
  const canRate = past && me.id === session.menteeId && !session.rating;

  return (
    // Mise en page selon la largeur de la carte elle-même (colonne étroite de l'accueil comme pleine page) :
    // actions sous le contenu quand la place manque, à droite sinon.
    <div
      className={cn(
        "@container rounded-2xl bg-papier p-4 shadow-doux sm:p-5",
        (session.status === "annulee" || session.status === "refusee") && "opacity-60",
        requested && "border-2 border-dashed border-terracotta/40",
      )}
    >
      <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4 @3xl:items-center">
          <div className={cn("flex w-16 shrink-0 flex-col items-center rounded-2xl py-2 text-center", soon ? "bg-terracotta text-white" : requested ? "bg-terracotta-light text-terracotta-dark" : "bg-beige/70")}>
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider">{formatDate(session.startsAt, { month: "short" })}</span>
            <span className="font-serif text-2xl font-semibold leading-none">{start.getDate()}</span>
            <span className="text-[0.7rem]">{formatDate(session.startsAt, { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-base leading-tight">{session.topic}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-nuit-500">
              <span className="inline-flex items-center gap-1.5">
                <Avatar user={other} size="xs" /> {other?.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon size={14} /> {FORMATS[session.format]} · {session.duration} min
              </span>
              {session.status === "annulee" && <span className="font-semibold text-terracotta-dark">Annulée</span>}
              {session.status === "refusee" && <span className="font-semibold text-terracotta-dark">Déclinée par le mentor</span>}
            </p>
            {requested && (
              <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-terracotta-light px-2.5 py-0.5 text-xs font-semibold text-terracotta-dark">
                <Clock size={12} className="shrink-0" />
                <span className="truncate">{iAmMentor ? "Créneau demandé · à valider" : "En attente de validation du mentor"}</span>
              </p>
            )}
            {session.notes && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-encre">
                <NotebookPen size={14} className="mt-0.5 shrink-0 text-nuit-500" aria-label="Notes de séance" />
                <span className="line-clamp-2">{session.notes}</span>
              </p>
            )}
            {session.rating && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={13} className={i <= (session.rating ?? 0) ? "fill-terracotta text-terracotta" : "text-beige-dark"} />
                ))}
                {session.review && <span className="ml-1 line-clamp-1 text-nuit-500">« {session.review} »</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 empty:hidden">
          {session.status === "planifiee" && (
            <>
              {session.format !== "presentiel" && (
                <Link href={session.format === "visio" ? `/visio/${session.id}` : `/messages?avec=${otherId}`} className={soon ? btn.accent : btn.primary}>
                  {session.format === "visio" ? <Video size={16} /> : <MessageCircle size={16} />} Rejoindre
                </Link>
              )}
              <button
                onClick={() => {
                  if (confirm("Annuler cette séance ?")) cancelSession(session.id);
                }}
                className={btn.quiet}
              >
                Annuler
              </button>
            </>
          )}
          {requested && iAmMentor && (
            <>
              <button onClick={() => setDeclining(true)} className={btn.ghost}>
                <X size={16} /> Décliner
              </button>
              <button onClick={() => respondSession(session.id, true)} className={btn.accent}>
                <Check size={16} /> Valider
              </button>
            </>
          )}
          {requested && !iAmMentor && (
            <button
              onClick={() => {
                if (confirm("Retirer cette demande de séance ?")) cancelSession(session.id);
              }}
              className={btn.quiet}
            >
              Retirer la demande
            </button>
          )}
          {canRate && onRate && (
            <button onClick={() => onRate(session)} className={btn.accent}>
              <Star size={16} /> Évaluer
            </button>
          )}
        </div>
      </div>

      <Modal open={declining} onClose={() => setDeclining(false)} title="Décliner la demande">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await respondSession(session.id, false, reason);
            setDeclining(false);
          }}
          className="space-y-5"
        >
          <p className="-mt-2 text-sm text-encre">
            « {session.topic} » le {formatDate(session.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}. {other?.name.split(" ")[0]} sera prévenu·e et pourra choisir un autre créneau.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Un mot d&apos;explication (facultatif)</span>
            <textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={field + " resize-none"} placeholder="Ex. : je suis en déplacement ce jour-là, essayons jeudi." />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeclining(false)} className={btn.ghost}>
              Retour
            </button>
            <button type="submit" className={btn.accent}>
              Décliner la demande
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function StatTile({ icon: Icon, value, label, tone = "beige" }: { icon: typeof Users; value: React.ReactNode; label: string; tone?: "beige" | "sauge" | "terracotta" | "ciel" | "or" }) {
  const tones = { beige: "bg-beige text-nuit-500", sauge: "bg-sauge-light text-sauge-dark", terracotta: "bg-terracotta-light text-terracotta-dark", ciel: "bg-ciel-light text-ciel", or: "bg-or-light text-or" };
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-papier p-5 shadow-doux">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-serif text-2xl leading-none tabular-nums">{value}</p>
        <p className="mt-1.5 text-xs leading-snug text-nuit-500">{label}</p>
      </div>
    </div>
  );
}

/** Confirmation de fin de mentorat, avec ses conséquences et un mot de fin facultatif. */
export function EndMentorshipModal({ mentorship, other, open, onClose, onEnded }: { mentorship: Mentorship; other: User; open: boolean; onClose: () => void; onEnded?: () => void }) {
  const { state, me, endMentorship } = useStore();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const upcoming = state.sessions.filter(
    (s) => s.mentorId === mentorship.mentorId && s.menteeId === mentorship.menteeId && (s.status === "planifiee" || s.status === "demandee") && new Date(s.startsAt).getTime() >= now,
  ).length;
  const goals = state.goals.filter((g) => g.userId === mentorship.menteeId && g.mentorId === mentorship.mentorId).length;
  const first = other.name.split(" ")[0];
  const byMentor = me?.id === mentorship.mentorId;

  return (
    <Modal open={open} onClose={onClose} title={`Clôturer le mentorat avec ${first}`}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const ok = await endMentorship(mentorship.id, message);
          setBusy(false);
          if (ok) {
            setMessage("");
            onClose();
            onEnded?.();
          }
        }}
        className="space-y-5"
      >
        <div className="space-y-2 text-sm text-encre">
          <p>{first} sera prévenu·e par un message et une notification.</p>
          <ul className="list-disc space-y-1 pl-5 text-nuit-500">
            {upcoming > 0 && <li>{upcoming === 1 ? "La séance à venir sera annulée." : `Les ${upcoming} séances à venir seront annulées.`}</li>}
            {goals > 0 && <li>{goals === 1 ? "L'objectif partagé ne sera plus suivi" : `Les ${goals} objectifs partagés ne seront plus suivis`} {byMentor ? "par vous." : `par ${first}.`}</li>}
            {byMentor ? <li>Une place se libère dans votre accompagnement.</li> : <li>Vous pourrez de nouveau demander un mentorat à {first} plus tard.</li>}
            <li>Votre conversation et l&apos;historique des séances sont conservés.</li>
          </ul>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Un mot de fin (facultatif)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={4} className={field} placeholder={`Merci ${first} pour…`} />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={btn.ghost}>
            Annuler
          </button>
          <button type="submit" disabled={busy} className={btn.primary}>
            <Check size={16} /> Clôturer le mentorat
          </button>
        </div>
      </form>
    </Modal>
  );
}
