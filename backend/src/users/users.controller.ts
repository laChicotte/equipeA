import { BadRequestException, Body, Controller, HttpCode, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { DOMAIN_IDS, FORMATS, PROFILES } from "../common/constants";
import { CurrentUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { toUser } from "../state/state.service";

class SlotDto {
  @IsInt()
  @Min(1)
  @Max(7)
  day: number;

  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;
}

class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(1500) bio?: string;
  @IsOptional() @IsString() @MaxLength(500) avatar?: string;
  @IsOptional() @IsArray() @IsIn(DOMAIN_IDS, { each: true }) domains?: string[];

  // Mentoré
  @IsOptional() @IsIn(PROFILES) profile?: string;
  @IsOptional() @IsString() @MaxLength(2000) need?: string;

  // Mentor
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(120) organization?: string;
  @IsOptional() @IsInt() @Min(0) @Max(60) years?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) capacity?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) skills?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(40, { each: true }) languages?: string[];
  @IsOptional() @IsArray() @IsIn(FORMATS, { each: true }) formats?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => SlotDto) slots?: SlotDto[];
}

const MENTOR_ONLY = ["title", "organization", "years", "capacity", "skills", "languages", "formats", "slots"] as const;
const MENTEE_ONLY = ["profile", "need"] as const;

@ApiTags("Membres")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  /** Met à jour son propre profil (les champs mentor ou mentoré selon le rôle). */
  @Patch("me")
  async update(@CurrentUser() me: string, @Body() dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: me } });
    if (!user) throw new NotFoundException();
    const forbidden = user.role === "mentor" ? MENTEE_ONLY : MENTOR_ONLY;
    const wrong = forbidden.filter((k) => dto[k] !== undefined);
    if (wrong.length) throw new BadRequestException(`Champs non disponibles pour votre rôle : ${wrong.join(", ")}.`);
    const { slots, ...rest } = dto;
    const updated = await this.prisma.user.update({
      where: { id: me },
      data: { ...rest, ...(slots ? { slots: slots.map((s) => ({ day: s.day, hour: s.hour })) } : {}) },
    });
    return toUser(updated);
  }

  /** Ajoute ou retire un mentor de ses favoris. */
  @Post("me/favorites/:mentorId")
  @HttpCode(200)
  async toggleFavorite(@CurrentUser() me: string, @Param("mentorId") mentorId: string) {
    const key = { userId_mentorId: { userId: me, mentorId } };
    if (await this.prisma.favorite.findUnique({ where: key })) {
      await this.prisma.favorite.delete({ where: key });
      return { favorite: false };
    }
    const mentor = await this.prisma.user.findFirst({ where: { id: mentorId, role: "mentor" } });
    if (!mentor) throw new NotFoundException("Mentor introuvable.");
    await this.prisma.favorite.create({ data: { userId: me, mentorId } });
    return { favorite: true };
  }
}
