# بودجهٔ عملکرد و منابع

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

## مبنای محیط
رایانهٔ گزارش‌شدهٔ کاربر: i5 نسل13، RTX3060 6GB، RAM8GB، SSD512GB. این benchmark نیست. sandbox مشاهده‌شده حدود1983MiB RAM و فاقد زنجیرهٔ Android است. دستگاه مرجع Android و فضای آزاد واقعی هنوز تصمیم بازند.

| حوزه | هدف اولیهٔ قابل ارزیابی، نه نتیجهٔ فعلی |
|---|---|
| تعامل Standard | هدف60fps؛ بودجهٔ frame حدود16.7ms؛ اندازه‌گیری missed frames |
| Low tier | کاهش layer/loop و decode، حفظ پاسخ‌گویی و منطق صحیح |
| شروع | cold/warm startup اندازه‌گیری شود؛ هدف اولیهٔ cold حدود3s روی دستگاه مرجع پس از انتخاب |
| حافظه | soft target اولیهٔ PSS حدود256MiB برای سفر core، قابل بازنگری با سنجش device؛ نه ضمانت فعلی |
| فهرست محتوا | virtualization/paging؛ همهٔ curriculum و تصویرها همزمان decode نشوند |
| رسانه | derivative مناسب viewport، lazy decode، audio preload محدود، pause off-screen |
| DB | index و query plan روی دادهٔ حجیم disposable؛ write transaction کوتاه؛ نه SQL روی UI thread |
| import | streaming/chunking و progress/cancel امن؛ staging و reserve براساس bytes واقعی |
| build Windows | incremental، اجرای سری jobهای سنگین، emulator/device متناسب باRAM؛ cloud با مجوز جدا |

بودجهٔ runtime/batch به معنی سقف total lesson/word/asset نیست. کتابخانهٔ بزرگ روی storage رشد می‌کند و فقط working set در RAM بار می‌شود. storage نامحدود وعده داده نمی‌شود؛ فضای اشغال و فضای لازم برای نصب/backup/rollback به کاربر نشان داده می‌شود. تمام اعداد provisional هستند و تنها بعد از اندازه‌گیری تصویب می‌شوند.
