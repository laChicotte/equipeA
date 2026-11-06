import { PrismaClient } from "@prisma/client";
import { createSeed } from "../src/demo/demo-data";
import { attachSeedPhotos } from "../src/demo/seed-photos";

/** Ajoute les photos de profil aux membres de démo existants, sans effacer la base (npm run db:photos). */
const prisma = new PrismaClient();

attachSeedPhotos(
  prisma,
  createSeed().users.map((u) => u.id),
)
  .then((n) => console.log(`${n} photo(s) de profil ajoutée(s).`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
