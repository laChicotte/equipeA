import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/demo/seeder";

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then((r) => console.log(`Base initialisée : ${r.users} membres, ${r.sessions} séances, ${r.resources} ressources.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
