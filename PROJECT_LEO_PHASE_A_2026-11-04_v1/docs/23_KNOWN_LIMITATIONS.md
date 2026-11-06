# محدودیت‌ها و وضعیت صادقانه

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

مرجع دقیق [KNOWN_ISSUES.csv](../inventory/KNOWN_ISSUES.csv) با ID، severity، evidence class و معیار رفع است.

- Native: پخش/ضبط Alert-only؛ پاسخ بدون persist؛ استریک/نشان ثابت؛ settings تنها state؛ renderer مثال/هشدار و grammar ناقص؛ stable IDs، migration، restore، multiple profiles و موتور exercise کامل غایب.
- وب: هسته‌های واقعی فراوان، اما integration providerهای شبیه‌سازی‌شده و ACK ناقص sync وجود دارند؛ امنیت multi-tenant کامل در A تأیید نشد.
- کپی اصلاح‌شدهٔ Windows و native lock در workspace نیست؛ ZIP قبلی native snapshot قدیمی است.
- audit کاربر شامل CRITICAL/HIGH حل‌نشده؛ این اسناد آن‌ها را رفع نکرده‌اند.
- بازبینی معلم/SME/حقوق asset، طراحی نهایی، animation rig، corpus A1–C2، installer/Android device verification موجود یا تأیید نشده.
- metadata/schema نام‌جدول برابر است، ولی migration tracking و schema/constraint equivalence کامل تأیید نشده.

درخواست «هر feature کامل» با تعداد جدول، route یا screenshot پاسخ داده نمی‌شود. FULLY_IMPLEMENTED تحت gate جدید فقط با مجموعهٔ شواهد UI/logic/data/error/a11y/docs/runtime مجاز است؛ این فاز چنین عنوان تازه‌ای به featureها نمی‌دهد.
