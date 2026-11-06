import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MessagesService } from "../messages/messages.service";
import { NotificationsService } from "../notifications/notifications.service";

const TZ = process.env.TZ_DISPLAY ?? "Africa/Conakry";
export const longDate = (d: Date) => d.toLocaleString("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Cycle de vie d'une séance :
 * - le mentor PROGRAMME une séance → « planifiee » directement ;
 * - le mentoré DEMANDE une séance → « demandee », puis le mentor la valide (« planifiee ») ou la décline (« refusee »).
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Exécute `fn` dans une transaction qui détient un verrou exclusif sur le créneau (mentor + heure).
   * Deux réservations ou validations simultanées du même créneau passent donc l'une après l'autre :
   * la seconde voit la première et échoue proprement au lieu de créer un doublon.
   */
  withSlotLock<T>(mentorId: string, startsAt: Date, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    const key = `slot:${mentorId}:${startsAt.toISOString()}`;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      return fn(tx);
    });
  }

  /** Le mentor confirme ou décline la demande de séance d'un mentoré. */
  async respond(mentorId: string, id: string, accept: boolean, reason?: string) {
    const s = await this.prisma.session.findUnique({ where: { id } });
    if (!s) throw new NotFoundException("Séance introuvable.");
    if (s.mentorId !== mentorId) throw new ForbiddenException("Seul le mentor valide une demande de séance.");
    if (s.status !== "demandee") throw new BadRequestException("Cette demande a déjà été traitée.");
    const why = reason?.trim();

    if (accept) {
      if (s.startsAt.getTime() < Date.now()) throw new BadRequestException("Ce créneau est passé : proposez plutôt une nouvelle date au mentoré.");
      await this.withSlotLock(mentorId, s.startsAt, async (tx) => {
        // Relu sous verrou : la demande a pu être traitée entre-temps (double clic, autre onglet).
        const fresh = await tx.session.findUnique({ where: { id }, select: { status: true } });
        if (fresh?.status !== "demandee") throw new BadRequestException("Cette demande a déjà été traitée.");
        const clash = await tx.session.findFirst({ where: { mentorId, startsAt: s.startsAt, status: "planifiee" } });
        if (clash) throw new BadRequestException("Vous avez déjà une séance sur ce créneau.");
        await tx.session.update({ where: { id }, data: { status: "planifiee" } });
      });
      await this.messages.send(mentorId, s.menteeId, `Séance confirmée le ${longDate(s.startsAt)} · ${s.topic}`, { system: true });
      await this.notifications.notify(s.menteeId, mentorId, `a confirmé votre séance « ${s.topic} »`, "/seances");
      // Les autres demandes sur le même créneau ne peuvent plus être honorées.
      const others = await this.prisma.session.findMany({ where: { mentorId, startsAt: s.startsAt, status: "demandee", id: { not: id } } });
      for (const o of others) await this.decline(o, "Ce créneau vient d'être attribué. Choisissez-en un autre.");
      return;
    }
    await this.decline(s, why);
  }

  private async decline(s: { id: string; mentorId: string; menteeId: string; topic: string; startsAt: Date }, reason?: string) {
    await this.prisma.session.update({ where: { id: s.id }, data: { status: "refusee" } });
    await this.messages.send(s.mentorId, s.menteeId, `Demande de séance déclinée (${longDate(s.startsAt)} · ${s.topic})${reason ? ` : ${reason}` : ""}`, { system: true });
    await this.notifications.notify(s.menteeId, s.mentorId, `n'est pas disponible pour « ${s.topic} »${reason ? ` : ${reason}` : ". Proposez un autre créneau."}`, "/seances");
  }
}
