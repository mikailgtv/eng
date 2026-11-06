import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ datasources: { db: { url: 'file:/home/user/e2e/e2e.db' } } });
const audits = await p.auditLog.findMany({ where: { action: { in: ['CROSS_TENANT_ACCESS','TENANT_UNSCOPED_RECORD_ACCESS'] } }, select: { action:true, entityType:true, metadata:true, actorId:true } });
console.log('cross-tenant audit rows:', audits.length);
for (const a of audits.slice(0,5)) console.log('  -', a.action, a.entityType, a.metadata);
const spoof = await p.user.findFirst({ where: { username: 'e2e.spoof.a' }, select: { organizationId: true } });
console.log('spoof-created user org:', spoof?.organizationId ?? 'not created');
await p.$disconnect();
