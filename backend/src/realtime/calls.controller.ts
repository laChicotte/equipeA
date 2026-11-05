import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsIn, IsObject, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { CurrentUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { CALL_SIGNALS, RealtimeService, type CallSignal } from "./realtime.service";

class SignalDto {
  /** Destinataire du signal */
  @IsString()
  to: string;

  /** Salle : « s:<idSéance> » pour une séance, « d:<idA>:<idB> » (triés) pour un appel direct */
  @IsString()
  @MaxLength(200)
  @Matches(/^(s:[\w-]+|d:[\w-]+:[\w-]+)$/)
  room: string;

  @IsIn(CALL_SIGNALS)
  kind: CallSignal;

  /** Données WebRTC (SDP, candidat ICE, état micro/caméra…) relayées telles quelles */
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/**
 * Signalisation des appels vidéo : le serveur ne voit jamais l'audio ni la vidéo,
 * qui circulent directement entre les deux navigateurs (WebRTC, chiffré de bout en bout par DTLS-SRTP).
 * Il se contente de relayer offres, réponses et candidats ICE via le flux temps réel.
 */
@ApiTags("Temps réel")
@ApiBearerAuth()
@Controller("calls")
export class CallsController {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("signal")
  @HttpCode(204)
  @ApiOperation({ summary: "Relaie un signal WebRTC à l'autre participant de l'appel." })
  async signal(@CurrentUser() me: string, @Body() dto: SignalDto) {
    if (dto.to === me) throw new BadRequestException("Impossible de s'appeler soi-même.");
    if (JSON.stringify(dto.payload ?? {}).length > 64_000) throw new BadRequestException("Signal trop volumineux.");
    await this.assertAllowed(me, dto.to, dto.room);
    this.realtime.emit([dto.to], { type: "call", data: { from: me, room: dto.room, kind: dto.kind, payload: dto.payload ?? {} } });
  }

  /** Seuls les deux participants d'une séance, ou deux membres déjà en relation, peuvent s'appeler. */
  private async assertAllowed(me: string, to: string, room: string) {
    if (room.startsWith("s:")) {
      const s = await this.prisma.session.findUnique({ where: { id: room.slice(2) }, select: { mentorId: true, menteeId: true } });
      const pair = s ? [s.mentorId, s.menteeId] : [];
      if (pair.includes(me) && pair.includes(to)) return;
      throw new ForbiddenException("Vous ne participez pas à cette séance.");
    }
    const [a, b] = [me, to].sort();
    if (room !== `d:${a}:${b}`) throw new BadRequestException("Salle d'appel invalide.");
    const [conversation, mentorship] = await Promise.all([
      this.prisma.conversation.findUnique({ where: { memberAId_memberBId: { memberAId: a, memberBId: b } }, select: { id: true } }),
      this.prisma.mentorship.findFirst({ where: { OR: [{ mentorId: me, menteeId: to }, { mentorId: to, menteeId: me }] }, select: { id: true } }),
    ]);
    if (!conversation && !mentorship) throw new ForbiddenException("Échangez d'abord un message avec ce membre avant de l'appeler.");
  }
}
