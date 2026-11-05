import { BadRequestException, Body, Controller, Delete, ForbiddenException, HttpCode, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { DOMAIN_IDS } from "../common/constants";
import { CurrentUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

class CreateGoalDto {
  @IsString() @MinLength(3) @MaxLength(160) title: string;
  @IsIn(DOMAIN_IDS) domain: string;
  @IsDateString() dueAt: string;
  @IsOptional() @IsString() mentorId?: string;
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(200, { each: true }) steps: string[];
}

class TextDto {
  @IsString() @MinLength(1) @MaxLength(1000) text: string;
}

@ApiTags("Objectifs")
@ApiBearerAuth()
@Controller("goals")
export class GoalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async mine(me: string, id: string) {
    const g = await this.prisma.goal.findUnique({ where: { id }, include: { steps: true } });
    if (!g) throw new NotFoundException("Objectif introuvable.");
    if (g.userId !== me) throw new ForbiddenException();
    return g;
  }

  @Post()
  async create(@CurrentUser() me: string, @Body() dto: CreateGoalDto) {
    if (dto.mentorId) {
      const ms = await this.prisma.mentorship.findFirst({ where: { mentorId: dto.mentorId, menteeId: me, status: "active" } });
      if (!ms) throw new BadRequestException("Vous ne pouvez partager un objectif qu'avec l'un de vos mentors.");
    }
    const steps = dto.steps.map((s) => s.trim()).filter(Boolean);
    const goal = await this.prisma.goal.create({
      data: {
        userId: me,
        mentorId: dto.mentorId || null,
        domain: dto.domain,
        title: dto.title.trim(),
        dueAt: new Date(dto.dueAt),
        steps: { create: steps.map((text, position) => ({ text, position })) },
      },
    });
    if (dto.mentorId) await this.notifications.notify(dto.mentorId, me, `vous associe à son objectif « ${goal.title} »`, "/objectifs");
    return { id: goal.id };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() me: string, @Param("id") id: string) {
    await this.mine(me, id);
    await this.prisma.goal.delete({ where: { id } });
  }

  @Post(":id/steps")
  async addStep(@CurrentUser() me: string, @Param("id") id: string, @Body() { text }: TextDto) {
    const g = await this.mine(me, id);
    const step = await this.prisma.step.create({ data: { goalId: id, text: text.trim(), position: g.steps.length } });
    return { id: step.id };
  }

  /** Coche / décoche une étape. Le mentor est prévenu quand l'objectif est atteint. */
  @Patch(":id/steps/:stepId/toggle")
  async toggleStep(@CurrentUser() me: string, @Param("id") id: string, @Param("stepId") stepId: string) {
    const g = await this.mine(me, id);
    const step = g.steps.find((s) => s.id === stepId);
    if (!step) throw new NotFoundException("Étape introuvable.");
    await this.prisma.step.update({ where: { id: stepId }, data: { done: !step.done } });
    const completed = !step.done && g.steps.every((s) => s.id === stepId || s.done);
    if (completed && g.mentorId) await this.notifications.notify(g.mentorId, me, `a atteint son objectif « ${g.title} »`, "/objectifs");
    return { done: !step.done, completed };
  }

  /** Conseil du mentor sur l'objectif de son mentoré. */
  @Patch(":id/mentor-note")
  @HttpCode(204)
  async mentorNote(@CurrentUser() me: string, @Param("id") id: string, @Body() { text }: TextDto) {
    const g = await this.prisma.goal.findUnique({ where: { id } });
    if (!g) throw new NotFoundException("Objectif introuvable.");
    if (g.mentorId !== me) throw new ForbiddenException("Seul le mentor associé peut commenter cet objectif.");
    await this.prisma.goal.update({ where: { id }, data: { mentorNote: text.trim() } });
    await this.notifications.notify(g.userId, me, `a commenté votre objectif « ${g.title} »`, "/objectifs");
  }
}
