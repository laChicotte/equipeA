import { DOMAINS, domainById } from "./domains";
import type { DomainId, State, User } from "./types";
import { normalize } from "./utils";

/** Mots à ignorer lors de l'analyse d'un besoin rédigé librement. */
const STOP = new Set(
  "je j me mon ma mes un une des de du la le les et ou a au aux en pour sur dans avec qui que quoi est suis veux voudrais aimerais souhaite besoin aide aider comment faire mais pas plus tres bien cette ce ces son sa ses nous vous il elle on y".split(" "),
);

function tokens(text: string) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Correspondance tolérante aux variantes (« éditeur » ↔ « édition », « entreprise » ↔ « entrepreneur »). */
function hits(words: string[], keyword: string) {
  return words.some((w) => {
    if (w === keyword) return true;
    let common = 0;
    while (common < w.length && common < keyword.length && w[common] === keyword[common]) common++;
    return common >= 4 && common >= Math.min(w.length, keyword.length) - 3;
  });
}

/**
 * Orientation automatique : à partir d'un besoin exprimé en langage naturel,
 * estime les domaines concernés (score décroissant).
 */
export function inferDomains(text: string): { id: DomainId; score: number }[] {
  const words = tokens(text);
  if (!words.length) return [];
  return DOMAINS.map((d) => ({ id: d.id, score: d.keywords.filter((k) => hits(words, k)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function mentorRating(state: State, mentorId: string) {
  const rated = state.sessions.filter((s) => s.mentorId === mentorId && s.rating);
  const done = state.sessions.filter((s) => s.mentorId === mentorId && s.status === "terminee").length;
  return {
    avg: rated.length ? rated.reduce((s, x) => s + (x.rating ?? 0), 0) / rated.length : 0,
    count: rated.length,
    sessions: done,
  };
}

export function activeMentees(state: State, mentorId: string) {
  return state.mentorships.filter((m) => m.mentorId === mentorId && m.status === "active").length;
}

export interface Match {
  mentor: User;
  score: number;
  reasons: string[];
  domain: DomainId;
}

/**
 * Recommandation de mentors : combine les domaines choisis, l'analyse du besoin,
 * le profil du mentoré, les compétences du mentor, les avis et la disponibilité.
 * Chaque point attribué est accompagné d'une explication lisible.
 */
export function recommendMentors(state: State, mentee: Pick<User, "domains" | "need" | "profile" | "city" | "id">, opts: { need?: string } = {}): Match[] {
  const need = opts.need ?? mentee.need ?? "";
  const words = tokens(need);
  const inferred = inferDomains(need);
  const wanted = new Set<DomainId>([...mentee.domains, ...inferred.slice(0, 2).map((x) => x.id)]);

  return state.users
    .filter((u) => u.role === "mentor" && u.id !== mentee.id)
    .map((mentor) => {
      let score = 0;
      const reasons: string[] = [];

      const shared = mentor.domains.filter((d) => wanted.has(d));
      const fromNeed = mentor.domains.filter((d) => inferred.some((x) => x.id === d));
      if (shared.length) {
        score += 30 + (shared.length - 1) * 8;
        reasons.push(`Expert·e en ${shared.map((d) => domainById(d)?.short).join(" et ")}`);
      }
      if (fromNeed.length) score += 10;

      const skillHits = (mentor.skills ?? []).filter((s) => tokens(s).some((t) => t.length > 2 && hits(words, t)));
      if (skillHits.length) {
        score += Math.min(24, skillHits.length * 12);
        reasons.push(`Compétences en lien avec votre besoin : ${skillHits.slice(0, 2).join(", ")}`);
      }

      if ((mentee.profile === "entrepreneur" || mentee.profile === "porteur-projet") && mentor.domains.includes("entrepreneuriat")) {
        score += 8;
        reasons.push("Accompagne des porteurs de projets");
      }
      if (mentee.profile === "reconversion" && (mentor.years ?? 0) >= 10) {
        score += 5;
        reasons.push("Parcours riche, idéal pour une reconversion");
      }

      const r = mentorRating(state, mentor.id);
      if (r.count) {
        score += r.avg * 3;
        if (r.avg >= 4.5) reasons.push(`Très bien noté·e (${r.avg.toFixed(1)}/5)`);
      }

      const free = (mentor.capacity ?? 3) - activeMentees(state, mentor.id);
      if (free <= 0) {
        score -= 25;
        reasons.push("Agenda complet pour le moment");
      } else if (free >= 2) score += 4;

      if (mentee.city && normalize(mentee.city) === normalize(mentor.city) && mentor.formats?.includes("presentiel")) {
        score += 5;
        reasons.push(`Basé·e à ${mentor.city} : rencontre possible`);
      }

      const domain = shared[0] ?? fromNeed[0] ?? mentor.domains[0];
      return { mentor, score: Math.max(0, Math.min(99, Math.round(score))), reasons, domain };
    })
    .sort((a, b) => b.score - a.score);
}

/** Prochains créneaux libres d'un mentor sur les deux semaines à venir. */
export function nextSlots(state: State, mentor: User, count = 6, from = Date.now()) {
  const booked = new Set(
    // Un créneau déjà demandé par un mentoré n'est plus proposé, même avant validation.
    state.sessions.filter((s) => s.mentorId === mentor.id && (s.status === "planifiee" || s.status === "demandee")).map((s) => new Date(s.startsAt).getTime()),
  );
  const out: Date[] = [];
  const start = new Date(from);
  start.setMinutes(0, 0, 0);
  for (let i = 0; i < 15 && out.length < count; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const weekday = day.getDay() === 0 ? 7 : day.getDay();
    for (const slot of (mentor.slots ?? []).filter((s) => s.day === weekday).sort((a, b) => a.hour - b.hour)) {
      const d = new Date(day);
      d.setHours(slot.hour, 0, 0, 0);
      if (d.getTime() > from + 2 * 3600_000 && !booked.has(d.getTime())) out.push(d);
      if (out.length >= count) break;
    }
  }
  return out;
}
