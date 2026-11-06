# مدیریت انتشار

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

سه version مستقل: application، database schema و content package. release manifest باید source revision/hash، lock hash، runtime/build toolchain، artifact hash، content versions، permission changes، migrations و known limitations را پیوند دهد.

## gate
تست pure/domain، repository، UI واقعی، accessibility/RTL، audio/physical mic، airplane mode، restart/reboot، migration/restore، dependency/security review و حقوق محتوا جدا گزارش شوند. «doctor پاس شد»، «تنظیمات موجود است» یا «mock موفق شد» release gate نیست.

Source و reports قدیمی حفظ؛ نسخهٔ جدید در working copy و با backup قابل تأیید. Git بدون مجوز initialize نشود. CI file با اجرای CI یکی نیست. token/keystore/DB connection value در اسناد و source قرار نگیرد.

Artifact archive فقط artifact واقعی: APK/AAB/installer به‌همراه checksum/log/instructions و rollback/upgrade notes. تا build و نصب واقعی انجام نشده، فایلی با پسوند جعلی ساخته یا readiness اعلام نشود. محتوای retired برای تفسیر attempt تاریخی بر اساس policy نگهداری شود.

فاز A فقط ZIP مستندات و شواهد read-only می‌دهد؛ نه release نسخهٔ برنامه.
