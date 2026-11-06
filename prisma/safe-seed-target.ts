import path from "node:path";

/** Guard all demo/test writers to an explicitly selected disposable SQLite file. */
export function assertDisposableSandboxTarget() {
  const url = process.env.DATABASE_URL;
  const confirmation = process.env.PHASE21_SANDBOX_CONFIRM;
  const isDeployment = process.env.NODE_ENV === "production" || process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
  if (isDeployment) throw new Error("Refusing demo/test writes in a deployment environment.");
  if (confirmation !== "YES") throw new Error("Set PHASE21_SANDBOX_CONFIRM=YES only for an isolated disposable sandbox database.");
  if (!url?.startsWith("file:")) throw new Error("Refusing demo/test writes: DATABASE_URL must explicitly target a local SQLite sandbox.");
  const file = url.slice("file:".length).split("?")[0];
  const resolved = path.resolve(process.cwd(), "prisma", file);
  const allowed = path.resolve(process.cwd(), "prisma", "phase21-sandbox.db");
  if (resolved !== allowed) {
    throw new Error("Refusing demo/test writes: only prisma/phase21-sandbox.db is allowlisted; the existing dev.db is protected.");
  }
  return resolved;
}
