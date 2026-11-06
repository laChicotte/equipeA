import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { FORMATS } from "../common/constants";
import { CurrentUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { MessagesService } from "../messages/messages.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DemoBotService } from "../demo/demo-bot.service";
import { longDate, SessionsService } from "./sessions.service";
import type { Slot } from "../common/types";

const SLOT_TZ = process.env.TZ_DISPLAY ?? "Africa/Conakry";
const WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Vrai si la date tombe pile sur un créneau hebdomadaire (jour + heure, fuseau de Conakry). */
function matchesSlot(date: Date, slots: Slot[]) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: SLOT_TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  const day = WEEKDAY[parts.weekday], hour = Number(parts.hour);
  return Number(parts.minute) === 0 && slots.some((s) => s.day === day && s.hour === hour);
}

class BookSessionDto {
  @IsString() mentorId: string;
  @IsString() menteeId: string;
  @IsDateString() startsAt: string;
  @IsIn(FORMATS) format: string;
  @IsString() @MinLength(2) @MaxLength(160) topic: string;
  @IsInt() @Min(15) @Max(180) duration: number;
}

class RespondDto {
  @IsBoolean() accept: boolean;
  /** Motif facultatif transmis au mentoré en cas de refus */
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

class NotesDto {
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

class RateDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(1000) review?: string;
}

@ApiTags("Séances")
@ApiBearerAuth()
@Controller("sessions")
export class SessionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly messages: MessagesService,
    private readonly notifications: NotificationsService,
    private readonly bot: DemoBotService,
  ) {}

  private async own(me: string, id: string) {
    const s = await this.prisma.session.findUnique({ where: { id } });
    if (!s) throw new NotFoundException("Séance introuvable.");
    if (s.mentorId !== me && s.menteeId !== me) throw new ForbiddenException();
    return s;
  }

  /**
   * Le mentor programme une séance (confirmée d'emblée) ; le mentoré en demande une,
   * qui reste « en attente de validation » jusqu'à la réponse du mentor.
   */
  @Post()
  @ApiOperation({ summary: "Programmer (mentor) ou demander (mentoré) une séance dans le cadre d'un mentorat actif." })
  async book(@CurrentUser() me: string, @Body() dto: BookSessionDto) {
    if (me !== dto.mentorId && me !== dto.menteeId) throw new ForbiddenException("Vous devez participer à la séance.");
    const byMentor = me === dto.mentorId;
    const ms = await this.prisma.mentorship.findFirst({ where: { mentorId: dto.mentorId, menteeId: dto.menteeId, status: "active" } });
    if (!ms) throw new BadRequestException("Une séance se programme dans le cadre d'un mentorat accepté.");
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() < Date.now()) throw new BadRequestException("Ce créneau est déjà passé.");
    const mentor = await this.prisma.user.findUnique({ where: { id: dto.mentorId } });
    if (mentor?.formats.length && !mentor.formats.includes(dto.format)) throw new BadRequestException("Ce mentor ne propose pas ce format.");
    // Le mentoré ne peut demander qu'un créneau correspondant aux disponibilités hebdomadaires du mentor.
    if (!byMentor && !matchesSlot(startsAt, (mentor?.slots as Slot[] | null) ?? [])) {
      throw new BadRequestException("Ce créneau ne fait pas partie des disponibilités du mentor. Choisissez l'une de ses heures, ou écrivez-lui pour un horaire exceptionnel.");
    }

    const topic = dto.topic.trim();
    const status = byMentor ? "planifiee" : "demandee";
    // Vérification et création sous verrou : deux réservations simultanées du même créneau ne peuvent pas aboutir toutes les deux.
    const session = await this.sessions.withSlotLock(dto.mentorId, startsAt, async (tx) => {
      const clash = await tx.session.findFirst({ where: { mentorId: dto.mentorId, startsAt, status: "planifiee" } });
      if (clash) throw new BadRequestException(byMentor ? "Vous avez déjà une séance à cette heure-là." : "Ce créneau vient d'être réservé. Choisissez-en un autre.");
      if (!byMentor) {
        const dup = await tx.session.findFirst({ where: { mentorId: dto.mentorId, menteeId: dto.menteeId, startsAt, status: "demandee" } });
        if (dup) throw new BadRequestException("Vous avez déjà demandé ce créneau : votre mentor va vous répondre.");
      }
      return tx.session.create({ data: { ...dto, topic, startsAt, status } });
    });
    const other = byMentor ? dto.menteeId : dto.mentorId;
    if (byMentor) {
      await this.messages.send(me, other, `Séance programmée le ${longDate(startsAt)} · ${topic}`, { system: true });
      await this.notifications.notify(other, me, `a programmé une séance : « ${topic} » (${longDate(startsAt)})`, "/seances");
    } else {
      await this.messages.send(me, other, `Demande de séance pour le ${longDate(startsAt)} · ${topic} (en attente de validation)`, { system: true });
      await this.notifications.notify(other, me, `demande une séance : « ${topic} ». À valider dans votre agenda.`, "/seances");
    }
    await this.bot.onSessionBooked(session.id, me, other, topic, status);
    return { id: session.id, status };
  }

  /** Le mentor valide ou décline une demande de séance. */
  @Patch(":id/respond")
  @HttpCode(204)
  respond(@CurrentUser() me: string, @Param("id") id: string, @Body() dto: RespondDto) {
    return this.sessions.respond(me, id, dto.accept, dto.reason);
  }

  /** Annule une séance prévue, ou retire une demande encore en attente. */
  @Patch(":id/cancel")
  @HttpCode(204)
  async cancel(@CurrentUser() me: string, @Param("id") id: string) {
    const s = await this.own(me, id);
    if (s.status !== "planifiee" && s.status !== "demandee") throw new BadRequestException("Seule une séance à venir peut être annulée.");
    // Une demande en attente se refuse côté mentor (avec un motif) ; le mentoré, lui, la retire.
    if (s.status === "demandee" && s.mentorId === me) return this.sessions.respond(me, id, false);
    await this.prisma.session.update({ where: { id }, data: { status: "annulee" } });
    const other = s.mentorId === me ? s.menteeId : s.mentorId;
    const what = s.status === "demandee" ? "Demande de séance retirée" : "Séance annulée";
    await this.messages.send(me, other, `${what} : ${s.topic} (${longDate(s.startsAt)})`, { system: true });
    await this.notifications.notify(other, me, s.status === "demandee" ? `a retiré sa demande de séance « ${s.topic} »` : `a annulé la séance « ${s.topic} »`, "/seances");
  }

  /** Fin de séance (bouton « Terminer » de la visio), avec les notes éventuelles. */
  @Patch(":id/complete")
  @HttpCode(204)
  async complete(@CurrentUser() me: string, @Param("id") id: string, @Body() { notes }: NotesDto) {
    const s = await this.own(me, id);
    if (s.status !== "planifiee" && s.status !== "terminee") throw new BadRequestException("Seule une séance confirmée peut être terminée.");
    await this.prisma.session.update({ where: { id }, data: { status: "terminee", ...(notes?.trim() ? { notes: notes.trim() } : {}) } });
  }

  @Patch(":id/notes")
  @HttpCode(204)
  async notes(@CurrentUser() me: string, @Param("id") id: string, @Body() { notes }: NotesDto) {
    await this.own(me, id);
    await this.prisma.session.update({ where: { id }, data: { notes: notes?.trim() || null } });
  }

  /** Évaluation par le mentoré : note de 1 à 5 et avis facultatif, visibles sur le profil du mentor. */
  @Patch(":id/rate")
  @HttpCode(204)
  async rate(@CurrentUser() me: string, @Param("id") id: string, @Body() dto: RateDto) {
    const s = await this.own(me, id);
    if (s.menteeId !== me) throw new ForbiddenException("Seul le mentoré évalue la séance.");
    if (s.status !== "planifiee" && s.status !== "terminee") throw new BadRequestException("Seule une séance qui a eu lieu s'évalue.");
    await this.prisma.session.update({ where: { id }, data: { rating: dto.rating, review: dto.review?.trim() || null, status: "terminee" } });
    await this.notifications.notify(s.mentorId, me, `a évalué votre séance « ${s.topic} » (${dto.rating}/5)`, `/mentors/${s.mentorId}`);
  }
}
