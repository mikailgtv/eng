# نقشهٔ بازاستفاده — فاز A، بدون انتقال کد

## انتقال محتوا، نه انتقال کورِ کل اپ

| منبع فعلی | ارزش قابل استفاده | کار لازم قبل از مصرف در محصول جدید |
|---|---|---|
| `prisma/curriculum/*` و JSON Native | دادهٔ آموزشی یکسان ۲۵ درس، ۱۰۰ واژه و مثال‌ها | stable ID و legacy alias، نگاشت objective/exercise/audio، فارسی مبتدی و QA مستقل |
| `public/audio/*` / `EnglishLearning-Offline/assets/audio/*` | ۸ فایل MP3 یکتا | حقوق/گوینده/transcript/audio review و اتصال واقعی به asset resolver |
| ماسکات‌های وب/Native و آیکون repair | مبنای بحث هویت و شناخت برند | یک canonical style، مجوز، منبع لایه‌دار و rig؛ stretched derivative کافی نیست |
| `src/lib/activities/{registry,schemas,check}` | taxonomy، validation و grading deterministic | جداکردن pure functions از transport، parity fixtures و review ابهام جواب |
| `src/lib/assessment/grading.ts` و intelligence | تفکیک auto/manual و assessment workflow | adapter محلی، versioned attempt snapshot، مرز official/self-practice |
| `src/lib/adaptive/review.ts` | قواعد مرور قابل پیکربندی | سیاست نسخه‌دار، profile clock و due-date tests؛ بدون claim اثربخشی علمی ثابت‌شده |
| `src/lib/gamification/rules.ts` | event/rule و استریک/سطح | تعریف روشن grace/timezone/estimated metrics و ledger atomic؛ حذف constantهای Native در فاز مجاز |
| `src/components/learn` و `practice` | الگوهای نمایش/تعامل و error feedback | بازنویسی adapter UI برای React Native؛ DOM یا browser audio مستقیم قابل استفاده نیست |
| `src/components/practice/audio-player.tsx` و speaking component | رفتار play/pause/seek، permission و recording UX | native implementation واقعی، device tests و تفکیک STT از phonetic scoring |
| `src/lib/teaching` و UI مدرس | کلاس، جلسه، assignment، review و attendance | حفظ وب؛ call-site permission/tenant tests و API contract قبل از companion Native |
| `src/lib/content` و `books` | authoring، workflow، version snapshot و کیفیت ساختاری | package format portable و review چندمرحله‌ای؛ private data به محتوا تبدیل نشود |
| `src/lib/identity` و auth | session، roles، scoped access و audit concepts | عدم تضعیف guards؛ بازبینی legacy/single-tenant assumptions و role mapping |
| `src/lib/certificates`, communication, workflows | زیرساخت گزارش، پیام و فرایند | قابلیت واقعی از simulated provider جدا؛ اعتبار/حقوق/authorization هر مسیر آزمون شود |
| تست‌ها و ۳۳۵ گزارش تاریخی | دانش خطا، مسیرهای واقعی و روش‌های آزمایش | فقط evidence با نسخه/محیط؛ real/mock/simulated تفکیک، PASS قدیمی تکرار نشود |

## چیزهایی که مستقیماً حمل نمی‌شوند

Prisma/client و connection configuration به کلاینت موبایل، cookie/session server به local profile، credential به app package، browser speech به فرض offline ASR، preview HTML به عنوان Native UI، mock provider به عنوان سرویس واقعی، Alert-only action یا ثابت ۳روز/۲نشان به عنوان gamification.

این جدول تصمیم اجرایی برای حذف/جابه‌جایی فایل نیست. هیچ source file در A منتقل نشد. قبل از major transformation، نسخهٔ فعلی واقعی Windows، backup معتبر و موافقت روی ADRها لازم‌اند. دیتابیس اصلی و historyهای migration به عنوان منبع حفاظت‌شده باقی می‌مانند.
