import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { SelfSecurity } from "@/components/identity/self-security";
import type { SessionUser } from "@/types";

export async function SecurityPage({ user }: { user: SessionUser }) {
  const [sessions, methods] = await Promise.all([
    prisma.userSession.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastActivityAt: true },
      orderBy: { lastActivityAt: "desc" },
    }),
    prisma.mfaMethod.findMany({ where: { userId: user.id }, select: { type: true, enabled: true } }),
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Security" description="Password, sign-in check, sessions and preferences. Times below are stored in UTC." />
      <SelfSecurity
        sessions={sessions.map((session) => ({ ...session, createdAt: session.createdAt.toISOString(), lastActivityAt: session.lastActivityAt.toISOString() }))}
        methods={methods}
      />
    </div>
  );
}
