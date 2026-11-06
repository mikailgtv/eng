# حفاظت انجام‌شده و حدود آن

فاز A فقط source را خوانده است. فایل‌های اصلی، lockfile، Node pin، migration histories و گزارش‌های قبلی تغییر نکرده‌اند؛ hashهای شروع و پایان در شواهد ثبت می‌شوند.

از `prisma/dev.db` با نبود WAL/SHM یک backup فشردهٔ جدید در پوشهٔ جدا تهیه شد. دادهٔ بازشده از backup با SHA-256 منبع برابر و integrity/FK check روی copy موفق بود؛ اصل DB برای اجرای query باز نشد. این کار restore کامل application یا تست Native نیست.

**فشرده‌سازی رمزگذاری نیست.** backup خصوصی gzip شده اما encrypted نیست؛ پوشهٔ جدید در محیط جاری mode 0700 و فایل آن mode 0600 دارد و داخل ZIP مستندات/سورس عمومی قرار نمی‌گیرد. نام غیرقابل حدس یا عبارت «خصوصی» جای authorization نیست؛ محافظت workspace و دانلودها همچنان لازم است. حفظ permissions پس از انتقال یا snapshot باید جدا بررسی شود.

کل workspace یا رایانهٔ Windows snapshot مستقل و restorable نشده است. اصل فایل‌ها حفظ و index/hash شده‌اند؛ hash به‌تنهایی backup نیست. snapshotهای پلتفرم best-effort و دارای محدودیت حجم/تعداد فایل‌اند، بنابراین قبل از تحول عمدهٔ آینده، نسخهٔ پشتیبان معتبر جدا از sandbox و در محل مورد تأیید مالک لازم است. هیچ دادهٔ واقعی، ضبط شخصی، secret یا credential در بستهٔ مستندات وارد نشده است.

SQLite و PostgreSQL migration historyها، manifest موجود، TLS verification و تست rogue-CA موجود باید در مراحل بعد حفظ شوند. هیچ db push/reset، تغییر provider، engine bypass، دانلود runtime یا اقدام privileged در این فاز انجام نشده است.
