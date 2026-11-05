import { Controller, ForbiddenException, Get, HttpCode, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
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

  /** Remet la base dans l'état de démonstration. Disponible uniquement si DEMO_MODE=true. */
  @Public()
  @Post("demo/reset")
  @HttpCode(200)
  reset() {
    if (process.env.DEMO_MODE !== "true") throw new ForbiddenException("La réinitialisation n'est disponible qu'en mode démonstration.");
    return seedDatabase(this.prisma);
  }
}
