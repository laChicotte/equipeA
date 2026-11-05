import type { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createSeed, DEMO_MENTOR_ID, DEMO_PASSWORD, DEMO_USER_ID } from "./demo-data";

/**
 * Vide la base puis insère les données de démonstration.
 * Les deux comptes de démo (Mariama, Aïssatou) sont de vrais comptes ; tous les autres membres
 * sont des « bots » qui réagissent automatiquement quand DEMO_MODE=true.
 */
export async function seedDatabase(prisma: PrismaClient) {
  const seed = createSeed();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const emailOf = new Map(seed.accounts.map((a) => [a.userId, a.email.toLowerCase()]));
  const sortPair = (a: string, b: string) => [a, b].sort() as [string, string];

  await prisma.$transaction(async (tx) => {
    // Ordre de suppression compatible avec les clés étrangères (les cascades font le reste).
    await tx.notification.deleteMany();
    await tx.message.deleteMany();
    await tx.conversation.deleteMany();
    await tx.step.deleteMany();
    await tx.goal.deleteMany();
    await tx.session.deleteMany();
    await tx.mentorship.deleteMany();
    await tx.resourceSave.deleteMany();
    await tx.resource.deleteMany();
    await tx.opportunityInterest.deleteMany();
    await tx.opportunity.deleteMany();
    await tx.favorite.deleteMany();
    await tx.user.deleteMany();

    await tx.user.createMany({
      data: seed.users.map(
        (u): Prisma.UserCreateManyInput => ({
          id: u.id,
          email: emailOf.get(u.id) ?? `${u.handle}@lirel.fr`,
          passwordHash,
          name: u.name,
          handle: u.handle,
          city: u.city,
          bio: u.bio,
          role: u.role,
          color: u.color,
          avatar: u.avatar,
          joinedAt: new Date(u.joinedAt),
          domains: u.domains,
          profile: u.profile,
          need: u.need,
          title: u.title,
          organization: u.organization,
          years: u.years,
          skills: u.skills ?? [],
          languages: u.languages ?? [],
          formats: u.formats ?? [],
          slots: u.slots ? (u.slots as unknown as Prisma.InputJsonValue) : undefined,
          capacity: u.capacity,
          verified: u.verified ?? false,
          bot: u.id !== DEMO_USER_ID && u.id !== DEMO_MENTOR_ID,
        }),
      ),
    });

    await tx.mentorship.createMany({
      data: seed.mentorships.map((m) => ({ ...m, createdAt: new Date(m.createdAt), acceptedAt: m.acceptedAt ? new Date(m.acceptedAt) : null })),
    });

    await tx.session.createMany({ data: seed.sessions.map((s) => ({ ...s, startsAt: new Date(s.startsAt) })) });

    for (const c of seed.conversations) {
      const [memberAId, memberBId] = sortPair(c.members[0], c.members[1]);
      await tx.conversation.create({
        data: {
          id: c.id,
          memberAId,
          memberBId,
          readA: c.readBy[memberAId] ? new Date(c.readBy[memberAId]) : null,
          readB: c.readBy[memberBId] ? new Date(c.readBy[memberBId]) : null,
          messages: { create: c.messages.map((m) => ({ id: m.id, userId: m.userId, text: m.text, system: !!m.system, createdAt: new Date(m.createdAt) })) },
        },
      });
    }

    for (const g of seed.goals) {
      await tx.goal.create({
        data: {
          id: g.id,
          userId: g.userId,
          mentorId: g.mentorId,
          domain: g.domain,
          title: g.title,
          dueAt: new Date(g.dueAt),
          mentorNote: g.mentorNote,
          createdAt: new Date(g.createdAt),
          steps: { create: g.steps.map((s, position) => ({ id: s.id, text: s.text, done: s.done, position })) },
        },
      });
    }

    await tx.resource.createMany({
      data: seed.resources.map(({ saves: _saves, ...r }) => ({ ...r, body: r.body as unknown as Prisma.InputJsonValue, createdAt: new Date(r.createdAt) })),
    });
    await tx.resourceSave.createMany({ data: seed.resources.flatMap((r) => r.saves.map((userId) => ({ userId, resourceId: r.id }))) });

    await tx.opportunity.createMany({
      data: seed.opportunities.map(({ interested: _i, ...o }) => ({ ...o, deadline: new Date(o.deadline), createdAt: new Date(o.createdAt) })),
    });
    await tx.opportunityInterest.createMany({ data: seed.opportunities.flatMap((o) => o.interested.map((userId) => ({ userId, opportunityId: o.id }))) });

    await tx.notification.createMany({
      data: seed.notifications.map((n) => ({ ...n, createdAt: new Date(n.createdAt) })),
    });

    await tx.favorite.createMany({
      data: Object.entries(seed.favorites).flatMap(([userId, ids]) => ids.map((mentorId) => ({ userId, mentorId }))),
    });
  }, { timeout: 30_000 });

  return { users: seed.users.length, sessions: seed.sessions.length, resources: seed.resources.length };
}
