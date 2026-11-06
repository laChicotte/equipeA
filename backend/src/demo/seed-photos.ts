import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";

/**
 * Photos de profil des membres de démonstration : backend/assets/avatars/<idMembre>.jpg.
 * Le chemin est le même depuis src/demo (tsx) et dist/demo (build).
 */
const AVATAR_DIR = join(__dirname, "..", "..", "assets", "avatars");

/** URL servie par GET /users/:id/photo ; « v » invalide le cache si les photos changent. */
export const seedAvatarUrl = (userId: string) => `/users/${userId}/photo?v=seed1`;

/** Photo JPEG du membre, si le fichier existe. */
export function seedPhoto(userId: string): Uint8Array<ArrayBuffer> | null {
  const file = join(AVATAR_DIR, `${userId}.jpg`);
  if (!existsSync(file)) return null;
  // Copie dans un ArrayBuffer dédié (le Buffer de Node peut partager un pool mémoire).
  const buf = readFileSync(file);
  const data = new Uint8Array(new ArrayBuffer(buf.length));
  data.set(buf);
  return data;
}

/**
 * Ajoute les photos aux membres de démo déjà en base, sans rien effacer.
 * Une photo choisie par le membre lui-même n'est jamais remplacée.
 */
export async function attachSeedPhotos(prisma: PrismaClient, userIds: string[]) {
  let added = 0;
  for (const userId of userIds) {
    const data = seedPhoto(userId);
    if (!data) continue;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { photo: { select: { userId: true } } } });
    if (!user || user.photo) continue;
    await prisma.$transaction([
      prisma.userPhoto.create({ data: { userId, data, mime: "image/jpeg" } }),
      prisma.user.update({ where: { id: userId }, data: { avatar: seedAvatarUrl(userId) } }),
    ]);
    added++;
  }
  return added;
}
