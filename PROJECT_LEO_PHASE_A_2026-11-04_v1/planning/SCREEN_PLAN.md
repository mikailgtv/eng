# نقشهٔ صفحه‌به‌صفحهٔ پیشنهادی

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

این نقشهٔ وظایف برای B است؛ wireframe یا screen نهایی پذیرفته‌شده نیست. هر ردیف باید در phone و tablet مرتبط، RTL/LTR، scaling و reduced motion بازبینی شود.

| صفحه | هدف | stateهای لازم |
|---|---|---|
| شروع/پروفایل | ساخت/انتخاب profile محلی بدون login اجباری | new/existing/locked/error |
| خانه/امروز | یک اقدام اصلی و هدف واقعی | zero/loading/available/save-error |
| مسیر/فصل/واحد | پیش‌نیاز و وضعیت content version | locked/unlocked/retired/missing |
| کتابخانهٔ بسته‌ها | دیدن اندازه/نصب/حذف امن محتوا | not-installed/installing/space-full/corrupt |
| lesson | آموزش ۱۴مرحله‌ای متناسب با درس | text/bidi/media-missing/unsupported |
| vocabulary | معنی، IPA، مثال و audio واقعی | new/bookmarked/audio-error |
| grammar | rule/example/exception در سطح مناسب | available/not-applicable/invalid |
| exercise | تعامل واقعی هر type supported | selected/submitting/feedback/commit-failed |
| lesson summary | پیشرفت/score واقعی و next/review | graded/self-rated/partial/save-failed |
| review | دلایل مرور و برنامهٔ قابل‌فهم | empty/due/in-progress/error |
| listening | پخش/seek/replay/speed feasible | loading/playing/paused/interrupted/error |
| speaking | consent/record/replay/delete | denied/ready/recording/finalizing/saved/full |
| progress | خلاصهٔ یادگیری و محدودیت شاخص | zero/data/estimated/not-enough-data |
| achievements | ledger-backed reward | locked/earned/no-duplicate |
| settings | زبان/theme/text/motion/sound پایدار | saved/saving/storage-error |
| backup/import | انتخاب scope، validation و restore امن | preflight/staging/verified/conflict/failure |
| teacher class/session | scope کلاس و حضور | empty/assigned/denied/stale |
| teacher assignment/review | تکلیف نسخه‌دار و feedback | draft/published/submitted/reviewed/error |
| organization reports | داده در scope با provenance | empty/permission-denied/export-error |
| organization admin | org/dept/team/class/role/audit | empty/denied/pending/audit-failed |
