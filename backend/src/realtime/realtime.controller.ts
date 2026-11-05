import { Controller, Sse } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "./realtime.service";

@ApiTags("Temps réel")
@ApiBearerAuth()
@Controller("realtime")
export class RealtimeController {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  @Sse()
  @ApiOperation({ summary: "Flux d'événements (SSE) : messages, lecture, saisie, présence, rafraîchissement." })
  async stream(@CurrentUser() me: string) {
    // En démo, les membres fictifs « répondent » : on les affiche donc en ligne.
    const bots = process.env.DEMO_MODE === "true" ? (await this.prisma.user.findMany({ where: { bot: true }, select: { id: true } })).map((u) => u.id) : [];
    return this.realtime.connect(me, bots);
  }
}
