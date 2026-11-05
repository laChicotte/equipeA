import { Injectable } from "@nestjs/common";
import type { User as DbUser } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { STATE_VERSION } from "../common/constants";
import type { Conversation, Goal, Mentorship, Opportunity, Resource, Session, Slot, State, User } from "../common/types";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : undefined);

/** Profil public : jamais d'e-mail ni de mot de passe. */
export function toUser(u: DbUser): User {
  return {
    id: u.id,
    name: u.name,
    handle: u.handle,
    city: u.city,
    bio: u.bio,
    role: u.role as User["role"],
    color: u.color,
    avatar: u.avatar ?? undefined,
    joinedAt: u.joinedAt.toISOString(),
    domains: u.domains as User["domains"],
    profile: (u.profile ?? undefined) as User["profile"],
    need: u.need ?? undefined,
    title: u.title ?? undefined,
    organization: u.organization ?? undefined,
    years: u.years ?? undefined,
    skills: u.skills,
    languages: u.languages,
    formats: u.formats as User["formats"],
    slots: (u.slots as Slot[] | null) ?? undefined,
    capacity: u.capacity ?? undefined,
    verified: u.verified,
    // Membre fictif animé par le mode démo : la visio est alors simulée.
    bot: process.env.DEMO_MODE === "true" && u.bot ? true : undefined,
  };
}

/**
 * Instantané de toutes les données visibles par l'utilisateur, dans la forme attendue par le front.
 * Les données privées des autres (messages de demande, notes de séance, conversations, objectifs)
 * ne sont jamais renvoyées.
 */
@Injectable()
export class StateService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(meId: string | null): Promise<State> {
    const me = meId ? await this.prisma.user.findUnique({ where: { id: meId } }) : null;
    const id = me?.id ?? null;

    const [users, mentorships, sessions, resources, opportunities] = await Promise.all([
      this.prisma.user.findMany({ orderBy: { joinedAt: "asc" } }),
      this.prisma.mentorship.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.session.findMany({ orderBy: { startsAt: "asc" } }),
      this.prisma.resource.findMany({ orderBy: { createdAt: "desc" }, include: { saves: id ? { where: { userId: id } } : false } }),
      this.prisma.opportunity.findMany({ orderBy: { createdAt: "desc" }, include: { interested: true } }),
    ]);

    const mine = (a: string, b: string) => !!id && (a === id || b === id);
    const activeMentees = id ? mentorships.filter((m) => m.mentorId === id && m.status === "active").map((m) => m.menteeId) : [];

    const [conversations, goals, notifications, favorites] = id
      ? await Promise.all([
          this.prisma.conversation.findMany({
            where: { OR: [{ memberAId: id }, { memberBId: id }] },
            include: { messages: { orderBy: { createdAt: "asc" } } },
          }),
          this.prisma.goal.findMany({
            where: { OR: [{ userId: id }, { mentorId: id }, { userId: { in: activeMentees } }] },
            include: { steps: { orderBy: { position: "asc" } } },
            orderBy: { createdAt: "desc" },
          }),
          this.prisma.notification.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 60 }),
          this.prisma.favorite.findMany({ where: { userId: id } }),
        ])
      : [[], [], [], []];

    return {
      version: STATE_VERSION,
      currentUserId: id,
      // Les membres sans compte de mentor ne sont visibles que connectés.
      users: users.filter((u) => id || u.role === "mentor").map(toUser),
      mentorships: mentorships.map(
        (m): Mentorship => ({
          id: m.id,
          mentorId: m.mentorId,
          menteeId: m.menteeId,
          domain: m.domain as Mentorship["domain"],
          axis: m.axis as Mentorship["axis"],
          // Le message de demande reste privé entre les deux personnes.
          message: mine(m.mentorId, m.menteeId) ? m.message : "",
          status: m.status as Mentorship["status"],
          createdAt: m.createdAt.toISOString(),
          acceptedAt: iso(m.acceptedAt),
        }),
      ),
      sessions: sessions.map((s): Session => {
        const own = mine(s.mentorId, s.menteeId);
        return {
          id: s.id,
          mentorId: s.mentorId,
          menteeId: s.menteeId,
          startsAt: s.startsAt.toISOString(),
          duration: s.duration,
          format: s.format as Session["format"],
          topic: s.topic,
          status: s.status as Session["status"],
          notes: own ? (s.notes ?? undefined) : undefined,
          rating: s.rating ?? undefined,
          review: s.review ?? undefined,
        };
      }),
      conversations: conversations.map(
        (c): Conversation => ({
          id: c.id,
          members: [c.memberAId, c.memberBId],
          messages: c.messages.map((m) => ({ id: m.id, userId: m.userId, text: m.text, createdAt: m.createdAt.toISOString(), system: m.system || undefined })),
          readBy: Object.fromEntries(
            [
              [c.memberAId, iso(c.readA)],
              [c.memberBId, iso(c.readB)],
            ].filter(([, v]) => v),
          ) as Record<string, string>,
        }),
      ),
      goals: goals.map(
        (g): Goal => ({
          id: g.id,
          userId: g.userId,
          mentorId: g.mentorId ?? undefined,
          domain: g.domain as Goal["domain"],
          title: g.title,
          dueAt: g.dueAt.toISOString(),
          mentorNote: g.mentorNote ?? undefined,
          createdAt: g.createdAt.toISOString(),
          steps: g.steps.map((s) => ({ id: s.id, text: s.text, done: s.done })),
        }),
      ),
      resources: resources.map(
        (r): Resource => ({
          id: r.id,
          title: r.title,
          kind: r.kind as Resource["kind"],
          domain: r.domain as Resource["domain"],
          authorId: r.authorId,
          summary: r.summary,
          minutes: r.minutes,
          body: r.body as Resource["body"],
          // Seul l'utilisateur courant sait ce qu'il a enregistré.
          saves: (r.saves ?? []).map((s) => s.userId),
          createdAt: r.createdAt.toISOString(),
        }),
      ),
      opportunities: opportunities.map(
        (o): Opportunity => ({
          id: o.id,
          title: o.title,
          organization: o.organization,
          kind: o.kind as Opportunity["kind"],
          domain: o.domain as Opportunity["domain"],
          city: o.city,
          deadline: o.deadline.toISOString(),
          description: o.description,
          authorId: o.authorId,
          interested: o.interested.map((x) => x.userId),
          createdAt: o.createdAt.toISOString(),
        }),
      ),
      notifications: notifications.map((n) => ({ id: n.id, userId: n.userId, actorId: n.actorId ?? undefined, text: n.text, href: n.href, read: n.read, createdAt: n.createdAt.toISOString() })),
      favorites: id ? { [id]: favorites.map((f) => f.mentorId) } : {},
    };
  }
}
