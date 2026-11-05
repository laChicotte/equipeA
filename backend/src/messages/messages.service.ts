import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  private static members(conv: { memberAId: string; memberBId: string }): [string, string] {
    return [conv.memberAId, conv.memberBId];
  }

  /** Conversation unique entre deux membres (créée au besoin). */
  async between(a: string, b: string) {
    if (a === b) throw new BadRequestException("Impossible de s'écrire à soi-même.");
    const [memberAId, memberBId] = [a, b].sort();
    return this.prisma.conversation.upsert({
      where: { memberAId_memberBId: { memberAId, memberBId } },
      update: {},
      create: { memberAId, memberBId },
    });
  }

  /** Envoie un message, marque la conversation lue pour l'auteur et prévient le destinataire. */
  async send(fromId: string, toId: string, text: string, opts: { system?: boolean; notify?: boolean } = {}) {
    const target = await this.prisma.user.findUnique({ where: { id: toId }, select: { id: true } });
    if (!target) throw new NotFoundException("Destinataire introuvable.");
    const conv = await this.between(fromId, toId);
    const now = new Date();
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { conversationId: conv.id, userId: fromId, text, system: opts.system ?? false, createdAt: now } }),
      this.prisma.conversation.update({ where: { id: conv.id }, data: conv.memberAId === fromId ? { readA: now } : { readB: now } }),
    ]);
    // Diffusion instantanée aux deux membres (et aux autres onglets de l'auteur).
    this.realtime.emit(MessagesService.members(conv), {
      type: "message",
      data: {
        conversationId: conv.id,
        members: MessagesService.members(conv),
        message: { id: message.id, userId: fromId, text, createdAt: now.toISOString(), system: message.system || undefined },
      },
    });
    if (opts.notify ?? !opts.system) {
      // Une seule notification non lue par conversation : on évite d'en empiler une par message.
      const pending = await this.prisma.notification.findFirst({ where: { userId: toId, read: false, href: { contains: conv.id } } });
      if (!pending) await this.notifications.notify(toId, fromId, "vous a envoyé un message", `/messages?c=${conv.id}`);
    }
    return conv.id;
  }

  async markRead(meId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException("Conversation introuvable.");
    if (conv.memberAId !== meId && conv.memberBId !== meId) throw new ForbiddenException();
    const now = new Date();
    await this.prisma.conversation.update({ where: { id: conv.id }, data: conv.memberAId === meId ? { readA: now } : { readB: now } });
    await this.notifications.markConversation(meId, conv.id);
    // L'interlocuteur voit « Vu » apparaître sous son dernier message.
    this.realtime.emit(MessagesService.members(conv), { type: "read", data: { conversationId: conv.id, userId: meId, at: now.toISOString() } });
  }

  /** Signale à l'interlocuteur que l'utilisateur est en train d'écrire. */
  async typing(meId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { memberAId: true, memberBId: true } });
    if (!conv) throw new NotFoundException("Conversation introuvable.");
    if (conv.memberAId !== meId && conv.memberBId !== meId) throw new ForbiddenException();
    const other = conv.memberAId === meId ? conv.memberBId : conv.memberAId;
    this.realtime.emit([other], { type: "typing", data: { conversationId, userId: meId } });
  }
}
