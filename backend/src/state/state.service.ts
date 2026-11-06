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

/** Profil réduit d'un mentoré sans lien avec l'utilisateur (auteur d'un avis public, d'une opportunité…). */
function toPublicUser(u: DbUser): User {
  return { ...toUser(u), city: "", bio: "", profile: undefined, need: undefined };
}

/**
 * Instantané des données visibles par l'utilisateur, dans la forme attendue par le front.
 * Tout est filtré dans les requêtes : ses propres données, les profils publics des mentors,
 * et le strict nécessaire sur les autres (avis publics, créneaux déjà pris, places occupées).
 * Les données privées des autres (messages de demande, notes de séance, conversations, objectifs,
 * profils de mentorés sans lien) ne sont jamais renvoyées.
 */
@Injectable()
export class StateService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(meId: string | null): Promise<State> {
    const me = meId ? await this.prisma.user.findUnique({ where: { id: meId }, select: { id: true } }) : null;
    const id = me?.id ?? null;
    const now = new Date();
    // « M'implique » / « ne m'implique pas » pour les séances et les mentorats.
    const mine = id ? [{ mentorId: id }, { menteeId: id }] : [];
    const notMine = id ? { NOT: mine } : {};

    const [mentors, myMentorships, otherActive, mySessions, publicSessions, resources, opportunities] = await Promise.all([
      this.prisma.user.findMany({ where: { role: "mentor" }, orderBy: { joinedAt: "asc" } }),
      id ? this.prisma.mentorship.findMany({ where: { OR: mine }, orderBy: { createdAt: "desc" } }) : [],
      // Mentorats des autres : uniquement les actifs, pour compter les places prises chez chaque mentor.
      this.prisma.mentorship.findMany({
        where: { status: "active", ...notMine },
        select: { id: true, mentorId: true, domain: true, axis: true, status: true, createdAt: true, acceptedAt: true },
      }),
      id ? this.prisma.session.findMany({ where: { OR: mine }, orderBy: { startsAt: "asc" } }) : [],
      // Séances des autres : notes et avis (profil des mentors), séances terminées (compteur)
      // et créneaux à venir déjà pris (pour ne pas les proposer).
      this.prisma.session.findMany({
        where: {
          ...notMine,
          OR: [{ rating: { not: null } }, { status: "terminee" }, { status: { in: ["planifiee", "demandee"] }, startsAt: { gte: now } }],
        },
        select: { id: true, mentorId: true, menteeId: true, startsAt: true, duration: true, format: true, topic: true, status: true, rating: true, review: true },
      }),
      this.prisma.resource.findMany({ orderBy: { createdAt: "desc" }, include: { saves: id ? { where: { userId: id } } : false } }),
      this.prisma.opportunity.findMany({ orderBy: { createdAt: "desc" }, include: { interested: { select: { userId: true } } } }),
    ]);

    const followed = myMentorships.filter((m) => m.mentorId === id && m.status === "active").map((m) => m.menteeId);
    const [conversations, goals, notifications, favorites] = id
      ? await Promise.all([
          this.prisma.conversation.findMany({
            where: { OR: [{ memberAId: id }, { memberBId: id }] },
            include: { messages: { orderBy: { createdAt: "asc" } } },
          }),
          this.prisma.goal.findMany({
            where: { OR: [{ userId: id }, { mentorId: id }, { userId: { in: followed } }] },
            include: { steps: { orderBy: { position: "asc" } } },
            orderBy: { createdAt: "desc" },
          }),
          this.prisma.notification.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 60 }),
          this.prisma.favorite.findMany({ where: { userId: id } }),
        ])
      : [[], [], [], []];

    // Membres en relation avec moi : profil complet. Simples auteurs publics : profil réduit.
    const related = new Set<string>(id ? [id] : []);
    for (const m of myMentorships) related.add(m.mentorId).add(m.menteeId);
    for (const s of mySessions) related.add(s.mentorId).add(s.menteeId);
    for (const c of conversations) related.add(c.memberAId).add(c.memberBId);
    for (const g of goals) {
      related.add(g.userId);
      if (g.mentorId) related.add(g.mentorId);
    }
    const visible = new Set(related);
    for (const n of notifications) if (n.actorId) visible.add(n.actorId);
    for (const s of publicSessions) if (s.review) visible.add(s.menteeId);
    for (const o of opportunities) visible.add(o.authorId);

    const mentorIds = new Set(mentors.map((u) => u.id));
    const others = await this.prisma.user.findMany({ where: { id: { in: [...visible].filter((x) => !mentorIds.has(x)) } } });
    const users = [...mentors, ...others].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    return {
      version: STATE_VERSION,
      currentUserId: id,
      users: users.map((u) => (u.role === "mentor" || related.has(u.id) ? toUser(u) : toPublicUser(u))),
      mentorships: [
        ...myMentorships.map(
          (m): Mentorship => ({
            id: m.id,
            mentorId: m.mentorId,
            menteeId: m.menteeId,
            domain: m.domain as Mentorship["domain"],
            axis: m.axis as Mentorship["axis"],
            message: m.message,
            status: m.status as Mentorship["status"],
            createdAt: m.createdAt.toISOString(),
            acceptedAt: iso(m.acceptedAt),
          }),
        ),
        // Le mentoré et son message restent privés : seule la place occupée chez le mentor est visible.
        ...otherActive.map(
          (m): Mentorship => ({
            id: m.id,
            mentorId: m.mentorId,
            menteeId: "",
            domain: m.domain as Mentorship["domain"],
            axis: m.axis as Mentorship["axis"],
            message: "",
            status: m.status as Mentorship["status"],
            createdAt: m.createdAt.toISOString(),
            acceptedAt: iso(m.acceptedAt),
          }),
        ),
      ],
      sessions: [
        ...mySessions.map(
          (s): Session => ({
            id: s.id,
            mentorId: s.mentorId,
            menteeId: s.menteeId,
            startsAt: s.startsAt.toISOString(),
            duration: s.duration,
            format: s.format as Session["format"],
            topic: s.topic,
            status: s.status as Session["status"],
            notes: s.notes ?? undefined,
            rating: s.rating ?? undefined,
            review: s.review ?? undefined,
          }),
        ),
        ...publicSessions.map((s): Session => {
          // Un avis écrit est public (auteur et sujet affichés sur le profil du mentor) ; le reste est anonymisé.
          const reviewed = !!s.review;
          return {
            id: s.id,
            mentorId: s.mentorId,
            menteeId: reviewed ? s.menteeId : "",
            startsAt: s.startsAt.toISOString(),
            duration: s.duration,
            format: s.format as Session["format"],
            topic: reviewed ? s.topic : "",
            status: s.status as Session["status"],
            rating: s.rating ?? undefined,
            review: s.review ?? undefined,
          };
        }),
      ].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
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
          // Le nombre d'intéressés est public, leur identité non : seul l'utilisateur courant s'y reconnaît.
          interested: o.interested.map((x) => (x.userId === id ? x.userId : "")),
          createdAt: o.createdAt.toISOString(),
        }),
      ),
      notifications: notifications.map((n) => ({ id: n.id, userId: n.userId, actorId: n.actorId ?? undefined, text: n.text, href: n.href, read: n.read, createdAt: n.createdAt.toISOString() })),
      favorites: id ? { [id]: favorites.map((f) => f.mentorId) } : {},
    };
  }
}
