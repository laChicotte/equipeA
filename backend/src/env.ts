import { existsSync } from "node:fs";
import { join } from "node:path";

/** Charge backend/.env (s'il existe) avant tout autre module. Les variables déjà définies sont prioritaires. */
const file = join(__dirname, "..", ".env");
if (existsSync(file)) process.loadEnvFile(file);
