# امنیت و حریم خصوصی

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

## واقعیت و محدودیت
گزارش npm کاربر برای نصب Native Windows: **۴۹ مورد، شامل ۱ CRITICAL، ۲۲ HIGH، ۲۳ MODERATE و ۳ LOW**. این audit در فاز A بازاجرا نشد و به پروژهٔ وب تعمیم داده نمی‌شود. exploitability در APK یا محیط build جدا بررسی می‌شود؛ شدت به دلیل دشواری اصلاح یا toolchain بودن کم نمی‌شود. `--force` و downgrade/upgrade بی‌بررسی راه‌حل نیستند.

## تهدیدها و قرارداد هدف
- device lost/shared: profile separation، screen lock/PIN با محدودیت روشن؛ SecureStore کل DB را خودکار رمزگذاری نمی‌کند. encryption و portable backup با key management واقعی طراحی شوند.
- import مخرب: path canonicalization، منع symlink/Zip Slip، bounds منابع و manifest validation؛ hash اصالت ناشر نیست و trust signature جداست.
- tenant/IDOR: server-derived scope، deny-by-default، teacher assignment و آزمایش منفی؛ hidden URL یا filename تصادفی authorization نیست.
- content/audio privacy: mic permission و consent، recording محلی پیش‌فرض، upload جدا، retention/deletion قابل فهم؛ دادهٔ واقعی learner در demo ممنوع.
- supply chain: lock واقعی، provenance/SBOM و review vulnerability در copy؛ secrets در native binary/config/docs/repo ممنوع؛ TLS verification تضعیف نشود.
- exports: scope دقیق، جلوگیری از CSV formula injection، کمینه‌سازی داده، عدم افزودن secret/PII به logs.

Providerهای integration که موفقیت ساختگی می‌دهند و مسیر sync ناقص یافتهٔ HIGH ثبت‌شده‌اند. پوشش tenant فعلی به عنوان امن تأیید نشده؛ نشت تازه‌ای نیز بدون runtime evidence ادعا نشده است.

هیچ credential در A درخواست نشد. فایل‌های حساس از bundle حذف‌اند؛ DB backup خصوصی است. عدم یافتن الگوهای secret در خروجی محدود، گواهی ممیزی جامع امنیت نیست.
