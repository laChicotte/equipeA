import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { DOMAIN_IDS, FORMATS, PROFILES } from "../common/constants";
import { CurrentUser, Public } from "../auth/auth.guard";
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

/** Photo déjà recadrée et compressée par le navigateur : quelques dizaines de Ko en pratique. */
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

type UploadedPhoto = { buffer: Buffer; size: number };

/** Type réel de l'image d'après ses premiers octets (on ne se fie pas au type déclaré par le client). */
function sniffImage(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
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

  /** Remplace sa photo de profil (JPEG, PNG ou WebP, 2 Mo max). */
  @Post("me/photo")
  @HttpCode(200)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { photo: { type: "string", format: "binary" } } } })
  @UseInterceptors(FileInterceptor("photo", { limits: { fileSize: PHOTO_MAX_BYTES, files: 1 } }))
  async uploadPhoto(@CurrentUser() me: string, @UploadedFile() file?: UploadedPhoto) {
    if (!file?.size) throw new BadRequestException("Aucune image reçue.");
    const mime = sniffImage(file.buffer);
    if (!mime) throw new BadRequestException("Format non pris en charge : utilisez une image JPEG, PNG ou WebP.");
    const data = new Uint8Array(file.buffer);
    const [, updated] = await this.prisma.$transaction([
      this.prisma.userPhoto.upsert({ where: { userId: me }, create: { userId: me, data, mime }, update: { data, mime } }),
      // Le paramètre de version invalide le cache navigateur à chaque nouvelle photo.
      this.prisma.user.update({ where: { id: me }, data: { avatar: `/users/${me}/photo?v=${Date.now().toString(36)}` } }),
    ]);
    return toUser(updated);
  }

  /** Supprime sa photo de profil (retour aux initiales). */
  @Delete("me/photo")
  async deletePhoto(@CurrentUser() me: string) {
    const [, updated] = await this.prisma.$transaction([
      this.prisma.userPhoto.deleteMany({ where: { userId: me } }),
      this.prisma.user.update({ where: { id: me }, data: { avatar: null } }),
    ]);
    return toUser(updated);
  }

  /** Photo de profil d'un membre (publique : chargée par de simples balises <img>). */
  @Public()
  @Get(":id/photo")
  async photo(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const photo = await this.prisma.userPhoto.findUnique({ where: { userId: id } });
    if (!photo) throw new NotFoundException("Aucune photo.");
    res.set({
      "Content-Type": photo.mime,
      // L'URL change à chaque nouvelle photo (?v=…) : le navigateur peut la garder indéfiniment.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return new StreamableFile(Buffer.from(photo.data));
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
