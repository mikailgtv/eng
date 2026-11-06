import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const n = await p.contentMedia.count();
  console.log('contentMedia.count OK =', n);
} catch (e) { console.log('contentMedia.count FAILED:', String(e).split('\n').slice(0,4).join(' | ')); }
try {
  const n = await p.messageAttachment.count();
  console.log('messageAttachment.count OK =', n);
} catch (e) { console.log('messageAttachment.count FAILED:', String(e).split('\n').slice(0,4).join(' | ')); }
await p.$disconnect();
