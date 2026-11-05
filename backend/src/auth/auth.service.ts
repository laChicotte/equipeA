import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { AVATAR_COLORS } from "../common/constants";
import { NotificationsService } from "../notifications/notifications.service";
import type { LoginDto, RegisterDto } from "./auth.dto";

const WELCOME_ACTOR = "m-thierno";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationsService,
  ) {}

  private async token(userId: string) {
    return { token: await this.jwt.signAsync({ sub: userId }), userId };
  }

  async login({ email, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException("Adresse e-mail ou mot de passe incorrect.");
    return this.token(user.id);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException("Un compte existe déjà avec cette adresse e-mail.");

    const handle =
      dto.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z]+/g, ".")
        .replace(/^\.|\.$/g, "") || "membre";

    const mentor = dto.role === "mentor";
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        name: dto.name.trim(),
        handle,
        city: dto.city?.trim() ?? "",
        role: dto.role,
        color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        domains: [],
        ...(mentor
          ? {
              // Formats et créneaux sont choisis par le mentor lui-même (inscription puis profil).
              capacity: 3,
              languages: ["Français"],
              years: 5,
            }
          : {}),
      },
    });

    const actor = await this.prisma.user.findUnique({ where: { id: WELCOME_ACTOR }, select: { id: true } });
    await this.notifications.notify(
      user.id,
      actor?.id ?? null,
      mentor ? "vous souhaite la bienvenue parmi les mentors MonMentor ! Complétez votre profil pour être recommandé·e." : "vous souhaite la bienvenue sur MonMentor ! Trouvez votre premier mentor en deux minutes.",
      mentor ? "/profil" : "/mentors",
    );
    return this.token(user.id);
  }
}
