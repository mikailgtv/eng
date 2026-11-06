import { PrismaClient } from "@prisma/client";
import { seedPhase20DemoCurriculum } from "./phase20-demo-curriculum";
import { assertDisposableSandboxTarget } from "./safe-seed-target";

try { assertDisposableSandboxTarget(); }
catch (error) { console.error(error instanceof Error ? error.message : "Unsafe seed target."); process.exit(1); }

if (process.env.NODE_ENV === "production") {
  console.error("Refusing Phase 20 demo curriculum seeding in production. Seed and validate against a staging database first.");
  process.exit(1);
}
if (process.env.PHASE20_SEED_CONFIRM !== "YES") {
  console.error("This additive seed writes original demo curriculum/book records. Set PHASE20_SEED_CONFIRM=YES to continue.");
  process.exit(1);
}

const prisma = new PrismaClient();
seedPhase20DemoCurriculum(prisma)
  .then((result) => console.log(JSON.stringify({ seeded: true, ...result }, null, 2)))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
