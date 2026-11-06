import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
for (const [name, fn] of [
  ['contentMedia.findFirst', () => p.contentMedia.findFirst()],
  ['messageAttachment.findFirst', () => p.messageAttachment.findFirst()],
]) {
  try { const r = await fn(); console.log(name, 'OK'); }
  catch (e) { console.log(name, 'FAILED:', (String(e).match(/no such column[^"]*"?[^"\n]*/)||[String(e).split('\n')[0]])[0]); }
}
await p.$disconnect();
