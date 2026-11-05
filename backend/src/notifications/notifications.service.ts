import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Crée la notification et demande au destinataire connecté de rafraîchir ses données. */
  async notify(userId: string, actorId: string | null, text: string, href: string) {
    const n = await this.prisma.notification.create({ data: { userId, actorId, text, href } });
    this.realtime.emit([userId], { type: "refresh", data: {} });
    return n;
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  /** Les notifications qui pointent vers une conversation sont lues quand on l'ouvre. */
  markConversation(userId: string, conversationId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false, href: { contains: conversationId } }, data: { read: true } });
  }
}
