import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { AXIS_IDS, DOMAIN_IDS } from "../common/constants";
import { CurrentUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { MessagesService } from "../messages/messages.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DemoBotService } from "../demo/demo-bot.service";

class RequestMentorshipDto {
  @IsString()
  mentorId: string;

  @IsIn(DOMAIN_IDS)
  domain: string;

  @IsIn(AXIS_IDS)
  axis: string;

  @IsString()
  @MinLength(20, { message: "Présentez-vous en quelques phrases (20 caractères minimum)." })
  @MaxLength(2000)
  message: string;
}

class RespondDto {
  @IsBoolean()
  accept: boolean;
}

class EndDto {
  /** Mot de fin facultatif, envoyé à l'autre personne dans la conversation */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

@ApiTags("Mise en relation")
@ApiBearerAuth()
@Controller("mentorships")
export class MentorshipsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
    private readonly notifications: NotificationsService,
    private readonly bot: DemoBotService,
  ) {}

  /** Un mentoré demande un mentorat : la demande est envoyée au mentor avec son message. */
  @Post()
  async request(@CurrentUser() me: string, @Body() dto: RequestMentorshipDto) {
    const [mentee, mentor] = await Promise.all([this.prisma.user.findUnique({ where: { id: me } }), this.prisma.user.findUnique({ where: { id: dto.mentorId } })]);
    if (!mentee || mentee.role !== "mentore") throw new ForbiddenException("Seuls les mentorés peuvent demander un mentorat.");
    if (!mentor || mentor.role !== "mentor") throw new NotFoundException("Mentor introuvable.");
    if (!mentor.domains.includes(dto.domain)) throw new BadRequestException("Ce mentor n'intervient pas dans ce domaine.");

    const existing = await this.prisma.mentorship.findFirst({ where: { mentorId: mentor.id, menteeId: me, status: { in: ["active", "en-attente"] } } });
    if (existing) throw new BadRequestException("Une demande est déjà en cours avec ce mentor.");
    const active = await this.prisma.mentorship.count({ where: { mentorId: mentor.id, status: "active" } });
    if (active >= (mentor.capacity ?? 3)) throw new BadRequestException("Ce mentor n'a plus de place disponible pour le moment.");

    const message = dto.message.trim();
    const ms = await this.prisma.mentorship.create({ data: { mentorId: mentor.id, menteeId: me, domain: dto.domain, axis: dto.axis, message, status: "en-attente" } });
    await this.messages.send(me, mentor.id, message, { notify: false });
    await this.notifications.notify(mentor.id, me, "vous a envoyé une demande de mentorat", "/accueil");
    await this.bot.onMentorshipRequested(ms.id, mentor.id, me, dto.domain);
    return { id: ms.id };
  }

  /** Le mentor accepte ou décline une demande. */
  @Patch(":id/respond")
  async respond(@CurrentUser() me: string, @Param("id") id: string, @Body() { accept }: RespondDto) {
    const ms = await this.prisma.mentorship.findUnique({ where: { id } });
    if (!ms) throw new NotFoundException("Demande introuvable.");
    if (ms.mentorId !== me) throw new ForbiddenException();
    if (ms.status !== "en-attente") throw new BadRequestException("Cette demande a déjà reçu une réponse.");

    await this.prisma.mentorship.update({ where: { id }, data: accept ? { status: "active", acceptedAt: new Date() } : { status: "refusee" } });
    if (accept) {
      await this.messages.send(me, ms.menteeId, "J'accepte votre demande, bienvenue ! Réservez une première séance quand vous voulez.", { notify: false });
      await this.notifications.notify(ms.menteeId, me, "a accepté votre demande de mentorat", `/mentors/${me}`);
      await this.bot.onMentorshipAccepted(me, ms.menteeId);
    } else {
      await this.messages.send(me, ms.menteeId, "Demande de mentorat déclinée.", { system: true });
      await this.notifications.notify(ms.menteeId, me, "n'est pas disponible pour vous accompagner. D'autres mentors vous attendent !", "/mentors/trouver");
    }
    return { status: accept ? "active" : "refusee" };
  }

  /**
   * L'un ou l'autre clôture un mentorat actif. En une seule transaction :
   * - le mentorat passe à « terminee » (la place se libère chez le mentor) ;
   * - les séances à venir entre eux (confirmées ou demandées) sont annulées ;
   * - les objectifs que le mentoré avait partagés avec ce mentor ne lui sont plus rattachés.
   * L'autre personne est prévenue par un message système (suivi du mot de fin éventuel) et une notification.
   */
  @Patch(":id/end")
  @HttpCode(204)
  async end(@CurrentUser() me: string, @Param("id") id: string, @Body() dto: EndDto) {
    const ms = await this.prisma.mentorship.findUnique({ where: { id } });
    if (!ms) throw new NotFoundException("Mentorat introuvable.");
    if (ms.mentorId !== me && ms.menteeId !== me) throw new ForbiddenException();
    if (ms.status !== "active") throw new BadRequestException("Seul un mentorat en cours peut être clôturé.");

    const pair = { mentorId: ms.mentorId, menteeId: ms.menteeId };
    const cancelled = await this.prisma.$transaction(async (tx) => {
      // Mise à jour conditionnelle : deux clôtures simultanées (double clic, les deux membres) n'en font qu'une.
      const { count } = await tx.mentorship.updateMany({ where: { id, status: "active" }, data: { status: "terminee" } });
      if (!count) throw new BadRequestException("Ce mentorat vient déjà d'être clôturé.");
      const sessions = await tx.session.updateMany({
        where: { ...pair, status: { in: ["planifiee", "demandee"] }, startsAt: { gte: new Date() } },
        data: { status: "annulee" },
      });
      await tx.goal.updateMany({ where: { userId: ms.menteeId, mentorId: ms.mentorId }, data: { mentorId: null } });
      return sessions.count;
    });

    const byMentor = me === ms.mentorId;
    const other = byMentor ? ms.menteeId : ms.mentorId;
    const detail = cancelled ? ` · ${cancelled} séance${cancelled > 1 ? "s" : ""} à venir annulée${cancelled > 1 ? "s" : ""}` : "";
    await this.messages.send(me, other, `Mentorat clôturé${detail}`, { system: true });
    const word = dto.message?.trim();
    if (word) await this.messages.send(me, other, word, { notify: false });
    await this.notifications.notify(
      other,
      me,
      byMentor ? "a clôturé votre mentorat. Pensez à évaluer vos séances : votre avis aide les prochains mentorés." : "a clôturé votre mentorat. Merci pour cet accompagnement !",
      byMentor ? "/seances" : `/membres/${ms.menteeId}`,
    );
  }
}
