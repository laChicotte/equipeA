import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MessagesService } from "../messages/messages.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DOMAIN_LABELS } from "../common/constants";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionsService } from "../sessions/sessions.service";

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Réponse plausible d'un membre de démonstration. */
function replyTo(text: string, authorIsMentor: boolean) {
  const t = normalize(text);
  if (/merci|super|parfait|genial/.test(t)) return pick(["Avec plaisir ! On continue comme ça.", "Merci à toi pour ton sérieux 🙏", "C'est un plaisir de t'accompagner."]);
  if (/cv|lettre|dossier/.test(t)) return "Envoie-moi la dernière version, je te fais un retour détaillé avant notre prochaine séance.";
  if (/entretien|oral|pitch|stress/.test(t)) return "On peut faire une simulation en visio. Prépare ta présentation en 2 minutes, je jouerai le jury.";
  if (/disponible|quand|rendez|seance|heure/.test(t)) return "Regarde mes créneaux dans l'onglet Séances et réserve celui qui t'arrange, je confirmerai.";
  if (text.includes("?"))
    return authorIsMentor ? "Bonne question, je regarde et je reviens vers vous ce soir." : "Bonne question ! Ma réponse courte : commence petit, mais commence aujourd'hui. On approfondit à la prochaine séance.";
  return authorIsMentor
    ? pick(["Bien reçu, merci !", "C'est noté, je m'y mets.", "Merci pour le conseil !"])
    : pick(["Très bien, continue sur cette lancée.", "Bien noté. Tiens-moi au courant de tes avancées.", "Excellent, on en parle à la prochaine séance."]);
}

/**
 * Mode démonstration : les comptes « bot » (tous les membres fictifs sauf les deux comptes de démo)
 * réagissent quelques secondes après une action, pour que la plateforme paraisse habitée devant le jury.
 * Désactivé si DEMO_MODE n'est pas « true ».
 */
@Injectable()
export class DemoBotService {
  private readonly logger = new Logger(DemoBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
    private readonly sessions: SessionsService,
  ) {}

  get enabled() {
    return process.env.DEMO_MODE === "true";
  }

  private async isBot(userId: string) {
    if (!this.enabled) return false;
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { bot: true } });
    return !!u?.bot;
  }

  private later(fn: () => Promise<unknown>, delay = 3000 + Math.random() * 3000) {
    setTimeout(() => {
      fn().catch((e: unknown) => this.logger.warn(`Action de démonstration ignorée : ${String(e)}`));
    }, delay);
  }

  /** Un mentor fictif accepte la demande et souhaite la bienvenue. */
  async onMentorshipRequested(mentorshipId: string, mentorId: string, menteeId: string, domain: string) {
    if (!(await this.isBot(mentorId))) return;
    this.later(async () => {
      const m = await this.prisma.mentorship.findUnique({ where: { id: mentorshipId } });
      if (!m || m.status !== "en-attente") return;
      await this.prisma.mentorship.update({ where: { id: m.id }, data: { status: "active", acceptedAt: new Date() } });
      await this.messages.send(
        mentorId,
        menteeId,
        `Bonjour ! J'accepte avec plaisir de vous accompagner en ${(DOMAIN_LABELS[domain] ?? domain).toLowerCase()}. Pour commencer, réservez une première séance de découverte : on fera le point sur vos objectifs.`,
        { notify: false },
      );
      await this.notifications.notify(menteeId, mentorId, "a accepté votre demande de mentorat", `/mentors/${mentorId}`);
    }, 5000);
  }

  /** Un mentoré fictif remercie le mentor qui vient d'accepter. */
  async onMentorshipAccepted(mentorId: string, menteeId: string) {
    if (!(await this.isBot(menteeId))) return;
    this.later(() => this.messages.send(menteeId, mentorId, "Merci infiniment d'avoir accepté ! Je réserve une séance dès ce soir."));
  }

  /** Le destinataire fictif répond au message. */
  async onMessage(fromId: string, toId: string, text: string) {
    if (!(await this.isBot(toId))) return;
    const from = await this.prisma.user.findUnique({ where: { id: fromId }, select: { role: true } });
    const delay = 2500 + Math.random() * 2500;
    // Le membre fictif lit le message, puis « écrit… » jusqu'à sa réponse.
    const conv = await this.messages.between(fromId, toId);
    this.later(() => this.messages.markRead(toId, conv.id), 800);
    for (let t = 1200; t < delay; t += 2000) {
      setTimeout(() => this.realtime.emit([fromId], { type: "typing", data: { conversationId: conv.id, userId: toId } }), t);
    }
    this.later(() => this.messages.send(toId, fromId, replyTo(text, from?.role === "mentor")), delay);
  }

  /** Le participant fictif confirme la séance réservée. */
  async onSessionBooked(sessionId: string, bookerId: string, otherId: string, topic: string, status: string) {
    if (!(await this.isBot(otherId))) return;
    // Demande d'un mentoré à un mentor fictif : il la valide après quelques secondes.
    if (status === "demandee") this.later(() => this.sessions.respond(otherId, sessionId, true), 4000 + Math.random() * 3000);
    // Séance programmée par un mentor avec un mentoré fictif : il en accuse réception.
    else this.later(() => this.messages.send(otherId, bookerId, `C'est noté pour « ${topic} », merci ! Je serai là.`));
  }
}
