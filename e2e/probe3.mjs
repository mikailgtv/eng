import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ log: [] });
try { await p.contentMedia.findFirst(); }
catch (e) { console.log('CODE:', e.code); console.log('MSG:', e.message.split('\n').filter(l=>l.trim()).slice(-3).join(' ')); }
await p.$disconnect();
