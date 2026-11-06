import { Controller, ForbiddenException, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthThrottlerGuard } from "../auth/auth.throttle";
import { Public } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { seedDatabase } from "./seeder";

@ApiTags("Démonstration")
@Controller()
export class DemoController {
  constructor(private readonly prisma: PrismaService) {}

  /** État de l'API et de la base (pour vérifier que tout tourne). */
  @Public()
  @Get("health")
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", demo: process.env.DEMO_MODE === "true" };
  }

  /**
   * Remet la base dans l'état de démonstration. Disponible uniquement si DEMO_MODE=true,
   * pour un membre connecté, et limité en fréquence. Ne jamais activer DEMO_MODE sur une base réelle.
   */
  @ApiBearerAuth()
  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("demo/reset")
  @HttpCode(200)
  reset() {
    if (process.env.DEMO_MODE !== "true") throw new ForbiddenException("La réinitialisation n'est disponible qu'en mode démonstration.");
    return seedDatabase(this.prisma);
  }
}
