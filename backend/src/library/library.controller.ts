import { Body, Controller, ForbiddenException, HttpCode, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { DOMAIN_IDS, OPPORTUNITY_KINDS, RESOURCE_KINDS } from "../common/constants";
import { CurrentUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";

class SectionDto {
  @IsString() @MaxLength(160) heading: string;
  @IsString() @MaxLength(10000) text: string;
}

class CreateResourceDto {
  @IsString() @MinLength(3) @MaxLength(160) title: string;
  @IsIn(RESOURCE_KINDS) kind: string;
  @IsIn(DOMAIN_IDS) domain: string;
  @IsString() @MinLength(10) @MaxLength(500) summary: string;
  @IsInt() @Min(1) @Max(240) minutes: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => SectionDto) body: SectionDto[];
}

class CreateOpportunityDto {
  @IsString() @MinLength(3) @MaxLength(160) title: string;
  @IsString() @MinLength(2) @MaxLength(120) organization: string;
  @IsIn(OPPORTUNITY_KINDS) kind: string;
  @IsIn(DOMAIN_IDS) domain: string;
  @IsString() @MaxLength(80) city: string;
  @IsDateString() deadline: string;
  @IsString() @MinLength(10) @MaxLength(3000) description: string;
}

@ApiTags("Ressources et opportunités")
@ApiBearerAuth()
@Controller()
export class LibraryController {
  constructor(private readonly prisma: PrismaService) {}

  /** Publication d'une ressource (réservée aux mentors). */
  @Post("resources")
  async createResource(@CurrentUser() me: string, @Body() dto: CreateResourceDto) {
    const user = await this.prisma.user.findUnique({ where: { id: me } });
    if (user?.role !== "mentor") throw new ForbiddenException("Les ressources sont rédigées par les mentors.");
    const r = await this.prisma.resource.create({
      data: { ...dto, title: dto.title.trim(), summary: dto.summary.trim(), authorId: me, body: dto.body.map((s) => ({ heading: s.heading.trim(), text: s.text.trim() })) },
    });
    return { id: r.id };
  }

  @Post("resources/:id/save")
  @HttpCode(200)
  async toggleSave(@CurrentUser() me: string, @Param("id") resourceId: string) {
    const key = { userId_resourceId: { userId: me, resourceId } };
    if (await this.prisma.resourceSave.findUnique({ where: key })) {
      await this.prisma.resourceSave.delete({ where: key });
      return { saved: false };
    }
    if (!(await this.prisma.resource.findUnique({ where: { id: resourceId }, select: { id: true } }))) throw new NotFoundException("Ressource introuvable.");
    await this.prisma.resourceSave.create({ data: { userId: me, resourceId } });
    return { saved: true };
  }

  /** Partage d'une opportunité ; les mentorés intéressés par le domaine sont prévenus. */
  @Post("opportunities")
  async createOpportunity(@CurrentUser() me: string, @Body() dto: CreateOpportunityDto) {
    const o = await this.prisma.opportunity.create({
      data: { ...dto, title: dto.title.trim(), organization: dto.organization.trim(), description: dto.description.trim(), deadline: new Date(dto.deadline), authorId: me },
    });
    const audience = await this.prisma.user.findMany({ where: { role: "mentore", domains: { has: dto.domain }, id: { not: me } }, select: { id: true }, take: 500 });
    await this.prisma.notification.createMany({
      data: audience.map((u) => ({ userId: u.id, actorId: me, text: `a publié une opportunité : ${o.title}`, href: `/opportunites#${o.id}` })),
    });
    return { id: o.id };
  }

  @Post("opportunities/:id/interest")
  @HttpCode(200)
  async toggleInterest(@CurrentUser() me: string, @Param("id") opportunityId: string) {
    const key = { userId_opportunityId: { userId: me, opportunityId } };
    if (await this.prisma.opportunityInterest.findUnique({ where: key })) {
      await this.prisma.opportunityInterest.delete({ where: key });
      return { interested: false };
    }
    if (!(await this.prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { id: true } }))) throw new NotFoundException("Opportunité introuvable.");
    await this.prisma.opportunityInterest.create({ data: { userId: me, opportunityId } });
    return { interested: true };
  }
}
