# معماری سازمانی

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

[Enterprise feature map](../ENTERPRISE_FEATURE_MAP.md) مرجع تفصیلی است.

Organization → Department → Team → Class → Learner هدف است. current LearningGroup فاقد teamId مستقیم است؛ existing catalog هشت access role روی سه base role دارد. organization administrator، training manager و platform administrator باید اختیار متفاوت و صریح داشته باشند.

## مرز اعتماد
local profile و client-sent role/score غیرقابل اتکا برای authorization/official assessment. server actor/tenant از session و data معتبر، target scope از رکورد واقعی. null legacy mapping با بررسی، نه backfill اولین org در محیط چندمشتری. cache، storage، export و webhook هم scope-aware.

## guardهای پذیرش
ماتریس role × tenant × class × resource؛ IDOR منفی، revocation، read/write/export/delete، pagination، bulk import، cross-tenant admin و audit failures. دو tenant synthetic فقط در محیط disposable مجاز؛ در این فاز ساخته نشدند.

Providerهای mock فعلی و ACK ناقص sync نباید به عنوان enterprise integration واقعی منتشر شوند. retention/deletion/backup policy با مشتری و الزامات قانونی تعیین شود؛ نه claim انطباق قانونی بدون ارزیابی. sync و server deployment نیازمند تصمیم/مجوز بعدی‌اند.
